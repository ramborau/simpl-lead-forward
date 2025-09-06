import { NextResponse } from 'next/server'
import { registerWebhookProgrammatically } from '@/lib/facebook'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // Contains webhook URL
  const error = searchParams.get('error')
  
  const baseUrl = process.env.NEXTAUTH_URL || 'https://simple-lead-forwarder-umtbo.ondigitalocean.app'
  
  if (error) {
    return NextResponse.redirect(`${baseUrl}?error=facebook_denied`)
  }
  
  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}?error=missing_params`)
  }

  const webhookUrl = decodeURIComponent(state)

  try {
    // Exchange code for access token
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token')
    tokenUrl.searchParams.append('client_id', process.env.FACEBOOK_APP_ID!)
    tokenUrl.searchParams.append('client_secret', process.env.FACEBOOK_APP_SECRET!)
    const redirectUri = `${process.env.NEXTAUTH_URL || 'https://simple-lead-forwarder-umtbo.ondigitalocean.app'}/api/facebook/callback`
    tokenUrl.searchParams.append('redirect_uri', redirectUri)
    tokenUrl.searchParams.append('code', code)

    const tokenResponse = await fetch(tokenUrl.toString())
    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      return NextResponse.redirect(`${baseUrl}?error=token_failed`)
    }

    const accessToken = tokenData.access_token

    // Register webhook programmatically (safe to call multiple times)
    const webhookRegistration = await registerWebhookProgrammatically()
    if (!webhookRegistration.success) {
      console.warn('Webhook registration failed (may already exist):', webhookRegistration.error)
    }

    // Get user's pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
    )
    const pagesData = await pagesResponse.json()

    if (!pagesData.data || pagesData.data.length === 0) {
      return NextResponse.redirect(`${baseUrl}?error=no_pages`)
    }

    // Redirect to page selection with token and webhook URL
    const params = new URLSearchParams({
      access_token: accessToken,
      webhook_url: webhookUrl,
      pages: JSON.stringify(pagesData.data.map((page: any) => ({
        id: page.id,
        name: page.name,
        access_token: page.access_token
      })))
    })

    return NextResponse.redirect(`${baseUrl}/select-page?${params.toString()}`)
  } catch (error) {
    console.error('Facebook callback error:', error)
    return NextResponse.redirect(`${baseUrl}?error=callback_failed`)
  }
}