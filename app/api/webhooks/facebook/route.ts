import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

// Verify Facebook webhook signature
function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!signature || !process.env.FACEBOOK_APP_SECRET) {
    console.log('Simple app: No signature or app secret')
    return true // Allow for testing
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', process.env.FACEBOOK_APP_SECRET)
    .update(body)
    .digest('hex')
  
  return signature === `sha256=${expectedSignature}`
}

// Forward lead to configured webhook with retry logic
async function forwardLead(leadData: Record<string, unknown>, webhookUrl: string, maxRetries: number = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Simple app: Attempt ${attempt}/${maxRetries} for webhook: ${webhookUrl}`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Source': 'simple-lead-forwarder',
          'X-Timestamp': new Date().toISOString()
        },
        body: JSON.stringify({
          event: 'lead.received',
          timestamp: new Date().toISOString(),
          lead: leadData
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        console.log(`Simple app webhook forwarding successful on attempt ${attempt}`)
        return true
      } else {
        console.error(`Simple app: Attempt ${attempt} failed with status ${response.status}: ${response.statusText}`)
        if (attempt === maxRetries) {
          return false
        }
      }
    } catch (error: unknown) {
      const errorDetails = {
        message: error.message,
        cause: error.cause,
        stack: error.stack?.split('\n').slice(0, 3).join('\n'),
        name: error.name,
        code: error.code || 'No code',
        webhookUrl,
        timestamp: new Date().toISOString()
      }
      
      console.error(`Simple app: Attempt ${attempt} failed with detailed error:`, errorDetails)
      
      if (attempt === maxRetries) {
        console.error(`Simple app webhook forwarding failed for ${webhookUrl} after ${maxRetries} attempts: ${error.message}`)
        return false
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s
        console.log(`Simple app: Waiting ${waitTime}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }
  
  return false
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')
  
  console.log('Simple app webhook received:', {
    headers: Object.fromEntries(request.headers.entries()),
    bodyPreview: rawBody.substring(0, 200),
    signature
  })
  
  // Verify webhook signature
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.log('Simple app: Invalid signature, rejecting webhook')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  let body
  try {
    body = JSON.parse(rawBody)
  } catch (error) {
    console.error('Simple app: Failed to parse webhook body:', error)
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  console.log('Simple app processing webhook data:', JSON.stringify(body, null, 2))

  // Get configuration from cookie
  const cookieStore = await cookies()
  const configCookie = cookieStore.get('simple-config')
  
  if (!configCookie) {
    console.log('Simple app: No configuration found')
    return NextResponse.json({ error: 'No configuration' }, { status: 404 })
  }

  let config
  try {
    config = JSON.parse(configCookie.value)
  } catch (error) {
    console.log('Simple app: Invalid configuration')
    return NextResponse.json({ error: 'Invalid configuration' }, { status: 500 })
  }

  try {
    // Process lead data
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'leadgen') {
          const leadgenId = change.value.leadgen_id
          const pageId = entry.id
          
          // Only process if it's for the configured page
          if (pageId !== config.pageId) {
            console.log(`Simple app: Ignoring lead for different page: ${pageId}`)
            continue
          }

          // Only process if it's from the configured form
          const formId = change.value.form_id
          if (formId && config.formId && formId !== config.formId) {
            console.log(`Simple app: Ignoring lead from different form: ${formId}`)
            continue
          }

          console.log(`Simple app: Processing lead ${leadgenId} from page ${pageId}`)

          // Fetch lead details from Facebook
          const leadResponse = await fetch(
            `https://graph.facebook.com/v18.0/${leadgenId}?access_token=${config.accessToken}`
          )
          
          if (!leadResponse.ok) {
            console.error('Simple app: Failed to fetch lead details')
            continue
          }

          const leadData = await leadResponse.json()
          
          // Parse field data
          const fields: Record<string, string> = {}
          if (leadData.field_data) {
            for (const field of leadData.field_data) {
              fields[field.name] = field.values?.[0] || ''
            }
          }

          // Prepare lead object
          const lead = {
            id: leadgenId,
            form_id: formId || config.formId,
            form_name: config.formName,
            page_id: pageId,
            page_name: config.pageName,
            created_time: leadData.created_time,
            fields: fields,
            raw_data: leadData
          }

          // Forward to webhook
          const forwarded = await forwardLead(lead, config.webhookUrl)
          
          if (forwarded) {
            console.log(`Simple app: Successfully forwarded lead ${leadgenId}`)
          } else {
            console.error(`Simple app: Failed to forward lead ${leadgenId}`)
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Simple app: Webhook processing error:', error)
    return NextResponse.json({ 
      error: 'Processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Facebook webhook verification
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  
  console.log('Simple app webhook verification:', { mode, token, challenge })
  
  if (mode === 'subscribe' && token === process.env.NEXTAUTH_SECRET) {
    console.log('Simple app: Webhook verified')
    return new Response(challenge)
  }
  
  return NextResponse.json({ error: 'Invalid request' }, { status: 403 })
}