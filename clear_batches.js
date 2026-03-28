const fetch = require('node-fetch');
const SUPABASE_URL = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_batches";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8";

fetch(SUPABASE_URL + '?id=not.is.null', {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
})
    .then(res => {
        console.log('Delete status core_batches:', res.status);
        return res.text();
    })
    .then(text => console.log('Delete resp:', text))
    .catch(err => console.error(err));
