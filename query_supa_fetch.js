const url = "https://opnjrzixsrizdnphbjnq.supabase.co";
const key = "HIDDEN_SECRET_BY_AI";

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
