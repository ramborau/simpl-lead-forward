import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { pageId, pageName, pageAccessToken, formId, formName, webhookUrl } = body

    if (!pageId || !pageAccessToken || !formId || !webhookUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Subscribe to page webhooks for leadgen
    const subscribeUrl = `https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`
    
    const subscribeResponse = await fetch(subscribeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_token: pageAccessToken,
        subscribed_fields: 'leadgen'
      })
    })

    if (!subscribeResponse.ok) {
      const errorData = await subscribeResponse.json()
      console.error('Facebook subscription error:', errorData)
      return NextResponse.json({ 
        error: 'Failed to subscribe to Facebook webhooks',
        details: errorData 
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