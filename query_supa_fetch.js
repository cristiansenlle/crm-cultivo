const url = "https://opnjrzixsrizdnphbjnq.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8";

async function checkSupa() {
     const fetchOpts = {
         headers: {
             'apikey': key,
             'Authorization': `Bearer ${key}`
         }
     };
     
     console.log("Fetching core_rooms...");
     const roomsRes = await fetch(`${url}/rest/v1/core_rooms?select=*&limit=5`, fetchOpts);
     if (roomsRes.ok) console.log(await roomsRes.json());
     else console.log(roomsRes.status, await roomsRes.text());
     
     console.log("Fetching core_salas...");
     const salasRes = await fetch(`${url}/rest/v1/core_salas?select=*&limit=5`, fetchOpts);
     if (salasRes.ok) console.log(await salasRes.json());
     else console.log(salasRes.status, await salasRes.text());
}

checkSupa();
