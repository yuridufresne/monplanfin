import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ljezchpqqyxgehdwvnot.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZXpjaHBxcXl4Z2VoZHd2bm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NzEwNjMsImV4cCI6MjA5ODE0NzA2M30.1-5F2Sndy9iUEQQadEgfjJmnaubkV27xrZHjV-AKwmg'

export const supabase = createClient(supabaseUrl, supabaseKey)
