import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wvsmmwnfqqgtzlvzbaht.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2c21td25mcXFndHpsdnpiYWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMjEyNDQsImV4cCI6MjA3MTg5NzI0NH0.nWCT-4bgxpt5a-bK_YUvPmIW_rOEZ1pFVD2ruh2M4MU'

export const supabase = createClient(supabaseUrl, supabaseKey)
