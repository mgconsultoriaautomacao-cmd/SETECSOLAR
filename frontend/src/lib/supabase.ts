import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dpmpxuahlpxucqeonrhk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwbXB4dWFobHB4dWNxZW9ucmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExOTcxNTYsImV4cCI6MjA5Njc3MzE1Nn0.KiC0krWgbb2CDJRmQ8HPxDZD2g71ZyePtQuYQ0ZQnCY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
