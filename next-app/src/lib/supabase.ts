import { createClient } from '@supabase/supabase-js';

// Usamos las credenciales extraídas de tu antiguo supabase-client.js
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://opnjrzixsrizdnphbjnq.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8';

export const supabase = createClient(supabaseUrl, supabaseKey);
