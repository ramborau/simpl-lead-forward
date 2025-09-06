import { NextResponse } from 'next/server'
import { registerWebhookProgrammatically, subscribePageToWebhook } from '@/lib/facebook'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { pageId, pageName, pageAccessToken, formId, formName, webhookUrl } = body

    if (!pageId || !pageAccessToken || !formId || !webhookUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // First, register the webhook at app level (this is idempotent, safe to call multiple times)
    const appRegistration = await registerWebhookProgrammatically()
    if (!appRegistration.success) {
      console.warn('App-level webhook registration failed (may already exist):', appRegistration.error)
      // Continue anyway as it might already be registered
    }

    // Subscribe the specific page to webhook events
    const pageSubscription = await subscribePageToWebhook(pageId, pageAccessToken)
    
    if (!pageSubscription.success) {
      console.error('Page subscription error:', pageSubscription.error)
      return NextResponse.json({ 
        error: 'Failed to subscribe page to Facebook webhooks',
        details: pageSubscription.error 
      }, { status: 500 })
    }

    // Store the configuration in cookies (since we're not using a database)
    // In production, you might want to use encrypted cookies or another method
    const response = NextResponse.json({ 
      success: true,
      message: 'Successfully subscribed to webhooks'
    })

    // Set secure HTTP-only cookie with configuration
    const configData = {
      pageId,
      pageName,
      formId,
      formName,
      webhookUrl,
      accessToken: pageAccessToken
    }
    
    response.cookies.set('simple-config', JSON.stringify(configData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    })

    return response
  } catch (error) {
    console.error('Subscribe error:', error)
    return NextResponse.json({ 
      error: 'Failed to subscribe to webhooks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}