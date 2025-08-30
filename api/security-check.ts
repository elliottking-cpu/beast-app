import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const { password } = req.body

    if (!password) {
      res.status(400).json({ error: 'Password is required' })
      return
    }

    // Create Supabase client server-side
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || 'https://wvsmmwnfqqgtzlvzbaht.supabase.co',
      process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2c21td25mcXFndHpsdnpiYWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMjEyNDQsImV4cCI6MjA3MVg5NzI0NH0.nWCT-4bgxpt5a-bK_YUvPmIW_rOEZ1pFVD2ruh2M4MU'
    )

    // Query setup_configuration table
    const { data, error } = await supabase
      .from('setup_configuration')
      .select('setup_password')
      .limit(1)

    console.log('Server-side Supabase query:', { data, error })

    if (error) {
      console.error('Server-side Supabase error:', error)
      res.status(500).json({ error: 'Database query failed', details: error })
      return
    }

    if (data && data.length > 0 && data[0].setup_password === password) {
      res.status(200).json({ success: true, message: 'Password correct' })
    } else {
      res.status(401).json({ success: false, message: 'Password incorrect' })
    }

  } catch (error) {
    console.error('API route error:', error)
    res.status(500).json({ error: 'Internal server error', details: error })
  }
}
