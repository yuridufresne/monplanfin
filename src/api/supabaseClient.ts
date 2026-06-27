import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ljezchpqqyxgehdwvnot.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZXpjaHBxcXl4Z2VoZHd2bm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1ODMxMjYsImV4cCI6MjA3ODE1OTEyNn0.nkPqjw02mTAJxuh7qsfU2ubk0aROsavC3Jo5Al0ZMWs'

export const supabase = createClient(supabaseUrl, supabaseKey)
