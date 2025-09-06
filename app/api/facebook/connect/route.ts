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
    const redirectUri = `${process.env.NEXTAUTH_URL || 'https://simple-lead-forwarder-umtbo.ondigitalocean.app'}/api/facebook/callback`
    facebookAuthUrl.searchParams.append('redirect_uri', redirectUri)
    facebookAuthUrl.searchParams.append('scope', 'pages_show_list,pages_read_engagement,leads_retrieval,pages_manage_metadata')
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