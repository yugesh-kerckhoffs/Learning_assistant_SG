import { createClient } from '@supabase/supabase-js';

// External Supabase project (user's existing data)
const EXTERNAL_SUPABASE_URL = 'https://wjrjhsllhcjefnittdlv.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indqcmpoc2xsaGNqZWZuaXR0ZGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NjY1NzMsImV4cCI6MjA4MDI0MjU3M30.uRyLsoKp3adnyrtfYedN0z-sVjilIE6WRikuYYmi9Bw';

export const externalSupabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY);
