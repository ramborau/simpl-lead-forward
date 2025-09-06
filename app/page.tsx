'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ExternalLink, Facebook, Webhook, CheckCircle2 } from 'lucide-react'

export default function HomePage() {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [config, setConfig] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Check if user is already configured
    const savedConfig = localStorage.getItem('simple-lead-config')
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig)
        setConfig(parsedConfig)
        setIsConnected(true)
        setWebhookUrl(parsedConfig.webhookUrl)
      } catch (e) {
        localStorage.removeItem('simple-lead-config')
      }
    }
  }, [])

  const handleConnectFacebook = async () => {
    if (!webhookUrl.trim()) {
      setError('Please enter a webhook URL')
      return
    }

    // Validate URL format
    try {
      new URL(webhookUrl)
    } catch (e) {
      setError('Please enter a valid URL')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Initiate Facebook OAuth
      const response = await fetch('/api/facebook/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl })
      })

      if (response.ok) {
        const data = await response.json()
        window.location.href = data.authUrl
      } else {
        throw new Error('Failed to initiate Facebook connection')
      }
    } catch (error) {
      setError('Failed to connect to Facebook. Please try again.')
      setLoading(false)
    }
  }

  const handleDisconnect = () => {
    localStorage.removeItem('simple-lead-config')
    setConfig(null)
    setIsConnected(false)
    setWebhookUrl('')
  }

  if (isConnected && config) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center py-8">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Simple Lead Forwarder
            </h1>
            <p className="text-gray-600">
              Your Facebook leads are being forwarded automatically
            </p>
          </div>

          {/* Status Card */}
          <div className="bg-white rounded-xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Configuration Status</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center">
                  <Facebook className="w-5 h-5 text-[#00c307] mr-2" />
                  <span className="font-medium">Facebook Page</span>
                </div>
                <span className="text-[#075e54] text-sm font-medium">{config.pageName}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center">
                  <Webhook className="w-5 h-5 text-[#00c307] mr-2" />
                  <span className="font-medium">Lead Form</span>
                </div>
                <span className="text-[#075e54] text-sm font-medium">{config.formName}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center">
                  <ExternalLink className="w-5 h-5 text-[#00c307] mr-2" />
                  <span className="font-medium">Webhook URL</span>
                </div>
                <span className="text-[#075e54] text-sm font-medium truncate max-w-xs">
                  {config.webhookUrl}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t">
              <button
                onClick={handleDisconnect}
                className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Disconnect & Reset
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="text-center text-gray-600 text-sm">
            <p>When someone submits your Facebook lead form, the data will be automatically</p>
            <p>forwarded to your configured webhook URL in real-time.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Simple Lead Forwarder
          </h1>
          <p className="text-gray-600">
            Forward Facebook leads to your webhook instantly - no signup required
          </p>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-xl shadow-xl p-6">
          <h2 className="text-xl font-semibold mb-6">Setup Your Lead Forwarding</h2>
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Step 1 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                1. Enter Your Webhook URL
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-server.com/webhook"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Your server endpoint where leads will be sent
              </p>
            </div>

            {/* Step 2 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                2. Connect Your Facebook Page
              </label>
              <button
                onClick={handleConnectFacebook}
                disabled={loading || !webhookUrl.trim()}
                className="w-full px-6 py-4 bg-[#00c307] text-white rounded-lg hover:bg-[#075e54] disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Facebook className="w-5 h-5" />
                    <span>Connect Facebook</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-medium text-[#075e54] mb-2">How it works:</h3>
            <ol className="text-sm text-[#075e54] space-y-1 list-decimal list-inside">
              <li>Enter your webhook URL where you want to receive leads</li>
              <li>Connect your Facebook page and select a lead form</li>
              <li>Leads are automatically forwarded to your webhook in real-time</li>
              <li>No database, no data storage - direct forwarding only</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
