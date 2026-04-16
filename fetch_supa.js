const headers = {
    'apikey': 'HIDDEN_SECRET_BY_AI',
    'Authorization': 'Bearer HIDDEN_SECRET_BY_AI'
};

fetch('https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/daily_telemetry?select=*&order=created_at.desc&limit=5', { headers })
    .then(res => res.json())
    .then(data => console.log('Telemetry:', data))
    .catch(console.error);

fetch('https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_rooms?select=*', { headers })
    .then(res => res.json())
    .then(data => console.log('Rooms:', data))
    .catch(console.error);
