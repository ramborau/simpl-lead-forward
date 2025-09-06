'use client'

import { useEffect, useState } from 'react'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'

export default function ApiDocsPage() {
  const [spec, setSpec] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/swagger')
      .then(res => res.json())
      .then(data => {
        setSpec(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load API spec:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00c307] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading API Documentation...</p>
        </div>
      </div>
    )
  }

  if (!spec) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Failed to Load API Documentation</h1>
          <p className="text-gray-600">Please try refreshing the page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#00322c] mb-4">
            Lead Forwarder API Documentation
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Interactive API documentation for the Lead Forwarder service. 
            Forward Facebook leads to your webhook endpoints with ease.
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <SwaggerUI 
            spec={spec}
            docExpansion="list"
            defaultModelsExpandDepth={2}
            defaultModelExpandDepth={2}
            displayOperationId={false}
            displayRequestDuration={true}
            filter={true}
            showExtensions={true}
            showCommonExtensions={true}
            tryItOutEnabled={true}
            requestInterceptor={(req) => {
              // Add any custom headers or modifications
              req.headers['X-API-Source'] = 'swagger-ui'
              return req
            }}
          />
        </div>

        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>
            📚 For detailed examples and guides, check the{' '}
            <a 
              href="https://github.com/ramborau/simpl-lead-forward" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#00c307] hover:underline"
            >
              GitHub Repository
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}