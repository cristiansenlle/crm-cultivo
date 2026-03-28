const https = require('https');

// Supabase Admin API - uses service_role key from the Supabase project
// We use the Management API to create a user properly
const SUPABASE_URL = 'opnjrzixsrizdnphbjnq.supabase.co';
// This is the anon key - for admin operations we need the service_role key
// We'll use the Supabase Admin API via the management endpoint

const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: '/auth/v1/admin/users',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU3NzY1MCwiZXhwIjoyMDg4MTUzNjUwfQ.placeholder', // service_role needed
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU3NzY1MCwiZXhwIjoyMDg4MTUzNjUwfQ.placeholder'
    }
};

// Actually, let's just test with the anon key first to see what the signup endpoint says
const signupOptions = {
    hostname: SUPABASE_URL,
    port: 443,
    path: '/auth/v1/signup',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8'
    }
};

const body = JSON.stringify({
    email: 'cristiansenlle@gmail.com',
    password: 'Fn@calderon6193',
    email_confirm: true
});

const req = https.request(signupOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', data);
    });
});

req.on('error', (e) => console.error('Error:', e));
req.write(body);
req.end();
