// Facebook API utilities for programmatic webhook registration

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID!
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET!
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!

// Register webhook with Facebook programmatically (app-level)
export async function registerWebhookProgrammatically() {
  try {
    console.log('Registering webhook programmatically with Facebook...')
    console.log('App ID:', FACEBOOK_APP_ID)
    console.log('NEXTAUTH_URL:', NEXTAUTH_URL)
    
    // Use app access token for app-level operations
    const appAccessToken = `${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`
    
    const webhookUrl = `${NEXTAUTH_URL}/api/webhooks/facebook`
    console.log('Webhook URL:', webhookUrl)
    console.log('Verify Token:', NEXTAUTH_SECRET)
    
    // Register webhook subscription at app level
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${FACEBOOK_APP_ID}/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          object: 'page',
          callback_url: webhookUrl,
          fields: 'leadgen',
          verify_token: NEXTAUTH_SECRET,
          access_token: appAccessToken
        })
      }
    )

    const data = await response.json()
    
    if (response.ok) {
      console.log('Webhook registered successfully:', data)
      return { success: true, data }
    } else {
      console.error('Failed to register webhook:', data)
      return { success: false, error: data.error }
    }
  } catch (error) {
    console.error('Error registering webhook:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Subscribe a specific page to webhook events
export async function subscribePageToWebhook(pageId: string, pageAccessToken: string) {
  try {
    console.log(`Subscribing page ${pageId} to webhook events...`)
    
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscribed_fields: 'leadgen',
          access_token: pageAccessToken
        })
      }
    )

    const data = await response.json()
    
    if (response.ok) {
      console.log(`Page ${pageId} subscribed successfully:`, data)
      return { success: true, data }
    } else {
      console.error(`Failed to subscribe page ${pageId}:`, data)
      return { success: false, error: data.error }
    }
  } catch (error) {
    console.error(`Error subscribing page ${pageId}:`, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}