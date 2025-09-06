import { NextResponse } from 'next/server'

// In-memory storage for debug data (resets on app restart)
let debugData: Array<{
  id: string
  timestamp: string
  type: 'webhook_received' | 'lead_processed' | 'webhook_forwarded' | 'error'
  data: any
  success?: boolean
  error?: string
}> = []

export async function GET() {
  // Return last 50 debug entries, most recent first
  return NextResponse.json({ 
    debug_data: debugData.slice(-50).reverse(),
    total_count: debugData.length 
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, data, success, error } = body
    
    const entry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      type,
      data,
      success,
      error
    }
    
    debugData.push(entry)
    
    // Keep only last 100 entries to prevent memory issues
    if (debugData.length > 100) {
      debugData = debugData.slice(-100)
    }
    
    return NextResponse.json({ success: true, entry })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to store debug data' }, { status: 500 })
  }
}

export async function DELETE() {
  debugData = []
  return NextResponse.json({ success: true, message: 'Debug data cleared' })
}