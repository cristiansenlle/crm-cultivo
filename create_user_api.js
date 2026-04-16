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
        'apikey': 'HIDDEN_SECRET_BY_AI', // service_role needed
        'Authorization': 'Bearer HIDDEN_SECRET_BY_AI'
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
        'apikey': 'HIDDEN_SECRET_BY_AI'
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
