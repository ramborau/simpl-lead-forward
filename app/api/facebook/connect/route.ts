import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { webhookUrl } = body

    if (!webhookUrl) {
      return NextResponse.json({ error: 'Webhook URL is required' }, { status: 400 })
    }

    // Store webhook URL temporarily (in production, you might use a database or secure storage)
    // For now, we'll pass it in the state parameter
    const encodedWebhookUrl = encodeURIComponent(webhookUrl)

    const facebookAuthUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth')
    facebookAuthUrl.searchParams.append('client_id', process.env.FACEBOOK_APP_ID!)
    facebookAuthUrl.searchParams.append('redirect_uri', 'https://simple-lead-forwarder-7xq65.ondigitalocean.app/api/facebook/callback')
    facebookAuthUrl.searchParams.append('scope', 'pages_manage_metadata')
    facebookAuthUrl.searchParams.append('response_type', 'code')
    facebookAuthUrl.searchParams.append('state', encodedWebhookUrl) // Pass webhook URL in state

    return NextResponse.json({ authUrl: facebookAuthUrl.toString() })
  } catch (error) {
    console.error('Facebook connect error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Facebook connection' }, 
      { status: 500 }
    )
  }
}