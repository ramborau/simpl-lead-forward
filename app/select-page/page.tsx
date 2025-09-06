'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Facebook, FileText, ChevronRight, Loader2 } from 'lucide-react'

interface Page {
  id: string
  name: string
  access_token: string
}

interface Form {
  id: string
  name: string
  status: string
  leads_count?: number
}

function SelectPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [pages, setPages] = useState<Page[]>([])
  const [selectedPage, setSelectedPage] = useState<Page | null>(null)
  const [forms, setForms] = useState<Form[]>([])
  const [selectedForm, setSelectedForm] = useState<Form | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const webhookUrl = searchParams.get('webhook_url')
  const accessToken = searchParams.get('access_token')

  useEffect(() => {
    const pagesParam = searchParams.get('pages')
    if (pagesParam) {
      try {
        const parsedPages = JSON.parse(pagesParam)
        setPages(parsedPages)
      } catch (e) {
        setError('Failed to load pages')
      }
    }
  }, [searchParams])

  const handleSelectPage = async (page: Page) => {
    setSelectedPage(page)
    setLoading(true)
    setError('')

    try {
      // Fetch forms for this page
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${page.id}/leadgen_forms?access_token=${page.access_token}`
      )
      const data = await response.json()

      if (data.data && data.data.length > 0) {
        setForms(data.data)
      } else {
        setError('No lead forms found for this page. Please create a lead form first.')
      }
    } catch (error) {
      setError('Failed to fetch forms')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectForm = async (form: Form) => {
    if (!selectedPage || !webhookUrl) return
    
    setSelectedForm(form)
    setLoading(true)

    try {
      // Subscribe to webhooks for this page
      const subscribeResponse = await fetch('/api/facebook/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: selectedPage.id,
          pageName: selectedPage.name,
          pageAccessToken: selectedPage.access_token,
          formId: form.id,
          formName: form.name,
          webhookUrl: webhookUrl
        })
      })

      if (!subscribeResponse.ok) {
        throw new Error('Failed to subscribe to webhooks')
      }

      // Save configuration to localStorage
      const config = {
        webhookUrl,
        pageId: selectedPage.id,
        pageName: selectedPage.name,
        formId: form.id,
        formName: form.name,
        accessToken: selectedPage.access_token,
        leadCount: 0
      }
      
      localStorage.setItem('simple-lead-config', JSON.stringify(config))
      
      // Redirect back to main page
      router.push('/')
    } catch (error) {
      setError('Failed to complete setup')
      setLoading(false)
    }
  }

  if (!webhookUrl || !accessToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 shadow-xl">
          <p className="text-red-600">Missing required parameters. Please start from the beginning.</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-[#00c307] text-white rounded hover:bg-[#075e54]"
          >
            Start Over
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-8">
          <h1 className="text-3xl font-bold text-[#00322c] mb-2">
            Select Your Page and Form
          </h1>
          <p className="text-[#00322c]">
            Choose the Facebook page and lead form to connect
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8 space-x-4">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-[#00c307] text-white flex items-center justify-center">
              ✓
            </div>
            <span className="ml-2 text-sm">Webhook Set</span>
          </div>
          <ChevronRight className="text-gray-400" />
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              selectedPage ? 'bg-[#00c307] text-white' : 'bg-gray-300 text-white'
            }`}>
              {selectedPage ? '✓' : '2'}
            </div>
            <span className="ml-2 text-sm">Select Page</span>
          </div>
          <ChevronRight className="text-gray-400" />
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              selectedForm ? 'bg-[#00c307] text-white' : 'bg-gray-300 text-white'
            }`}>
              {selectedForm ? '✓' : '3'}
            </div>
            <span className="ml-2 text-sm">Select Form</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Page Selection */}
        {!selectedPage && (
          <div className="bg-white rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Facebook className="w-6 h-6 mr-2 text-[#00c307]" />
              Select a Facebook Page
            </h2>
            <div className="space-y-3">
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => handleSelectPage(page)}
                  className="w-full p-4 border rounded-lg hover:bg-green-50 hover:border-green-300 transition text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{page.name}</p>
                      <p className="text-sm text-[#00322c]">ID: {page.id}</p>
                    </div>
                    <ChevronRight className="text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form Selection */}
        {selectedPage && !selectedForm && (
          <div className="bg-white rounded-xl shadow-xl p-6">
            <div className="mb-4">
              <p className="text-sm text-[#00322c]">Selected Page:</p>
              <p className="font-semibold">{selectedPage.name}</p>
            </div>
            
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FileText className="w-6 h-6 mr-2 text-[#075e54]" />
              Select a Lead Form
            </h2>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-[#00c307]" />
              </div>
            ) : forms.length > 0 ? (
              <div className="space-y-3">
                {forms.map((form) => (
                  <button
                    key={form.id}
                    onClick={() => handleSelectForm(form)}
                    disabled={loading}
                    className="w-full p-4 border rounded-lg hover:bg-green-50 hover:border-green-300 transition text-left disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{form.name}</p>
                        <p className="text-sm text-[#00322c]">
                          Status: {form.status} 
                          {form.leads_count !== undefined && ` • ${form.leads_count} leads`}
                        </p>
                      </div>
                      <ChevronRight className="text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#00322c]">
                <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No lead forms found for this page.</p>
                <p className="text-sm mt-2">Please create a lead form in Facebook first.</p>
              </div>
            )}
          </div>
        )}

        {/* Loading state */}
        {loading && selectedForm && (
          <div className="bg-white rounded-xl shadow-xl p-8">
            <div className="flex flex-col items-center">
              <Loader2 className="w-12 h-12 animate-spin text-[#00c307] mb-4" />
              <p className="text-lg font-semibold">Setting up webhook...</p>
              <p className="text-sm text-[#00322c] mt-2">This will just take a moment</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SelectPagePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 shadow-xl">
          <Loader2 className="w-8 h-8 animate-spin text-[#00c307] mx-auto" />
          <p className="mt-2 text-[#00322c]">Loading...</p>
        </div>
      </div>
    }>
      <SelectPageContent />
    </Suspense>
  )
}