import { createClient } from '@supabase/supabase-js'

// Config Supabase via variables d'env Vite (rotation possible cote Vercel sans
// toucher au code). REPLI sur les valeurs publiques actuelles si l'env est
// absente : les vars Vercel sont scopees Production, donc dev local / preview
// deploy / build CI n'y ont pas acces -> le repli evite tout ecran blanc.
// La cle anon est PUBLIQUE par design (livree dans le bundle) ; c'est la RLS
// Supabase qui protege les donnees, pas le secret de cette cle.
const ENV = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {}
const supabaseUrl = ENV.VITE_SUPABASE_URL || 'https://ljezchpqqyxgehdwvnot.supabase.co'
const supabaseKey = ENV.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZXpjaHBxcXl4Z2VoZHd2bm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NzEwNjMsImV4cCI6MjA5ODE0NzA2M30.1-5F2Sndy9iUEQQadEgfjJmnaubkV27xrZHjV-AKwmg'

export const supabase = createClient(supabaseUrl, supabaseKey)
