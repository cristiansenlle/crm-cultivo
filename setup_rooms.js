const fetch = require('node-fetch');

const SUPABASE_URL = "https://opnjrzixsrizdnphbjnq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8";

const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};

async function setup() {
    // 1. Clear ALL existing test records from core_batches
    console.log('Clearing all core_batches...');
    const delBatches = await fetch(`${SUPABASE_URL}/rest/v1/core_batches?id=not.is.null`, {
        method: 'DELETE',
        headers
    });
    console.log('core_batches DELETE:', delBatches.status);

    // 2. Clear ALL existing telemetry
    console.log('Clearing all daily_telemetry...');
    const delTel = await fetch(`${SUPABASE_URL}/rest/v1/daily_telemetry?id=gt.0`, {
        method: 'DELETE',
        headers
    });
    console.log('daily_telemetry DELETE:', delTel.status);

    // 3. Try to insert a test room into core_rooms to check if table exists
    console.log('Testing core_rooms table...');
    const testRoom = await fetch(`${SUPABASE_URL}/rest/v1/core_rooms?name=eq.___test___`, {
        headers: { ...headers, 'Prefer': 'return=minimal' }
    });
    console.log('core_rooms probe status:', testRoom.status);
    const probeText = await testRoom.text();
    console.log('core_rooms probe response:', probeText);
}

setup().catch(console.error);
