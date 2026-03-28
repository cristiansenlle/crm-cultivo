const headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8'
};

fetch('https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/daily_telemetry?select=*&order=created_at.desc&limit=5', { headers })
    .then(res => res.json())
    .then(data => console.log('Telemetry:', data))
    .catch(console.error);

fetch('https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_rooms?select=*', { headers })
    .then(res => res.json())
    .then(data => console.log('Rooms:', data))
    .catch(console.error);
