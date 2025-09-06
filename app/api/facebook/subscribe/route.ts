import { NextResponse } from 'next/server'
import { registerWebhookProgrammatically, subscribePageToWebhook } from '@/lib/facebook'
import { setConfig } from '@/lib/config-store'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { pageId, pageName, pageAccessToken, forms, webhookUrl, formId, formName } = body

    // Support both single form (legacy) and multiple forms (new)
    let formsArray = []
    if (forms && Array.isArray(forms)) {
      formsArray = forms
    } else if (formId && formName) {
      // Legacy single form support
      formsArray = [{ id: formId, name: formName }]
    }

    if (!pageId || !pageAccessToken || formsArray.length === 0 || !webhookUrl) {
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

    // Store configuration in memory (server-side)
    const configData = {
      pageId,
      pageName,
      forms: formsArray,
      webhookUrl,
      accessToken: pageAccessToken
    }
    
    setConfig(configData)
    
    // Also set cookie for client-side display (but not for webhook processing)
    const response = NextResponse.json({ 
      success: true,
      message: 'Successfully subscribed to webhooks'
    })
    
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