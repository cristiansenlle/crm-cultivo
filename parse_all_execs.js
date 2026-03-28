const fs = require('fs');

[100, 99, 98, 97, 96].forEach(id => {
    try {
        const file = `clean_e${id}.json`;
        if(!fs.existsSync(file)) return;
        const raw = fs.readFileSync(file, 'utf8');
        console.log(`\\n======= DUMP ${id} =======`);
        
        const chatMatch = raw.match(/"chatInput":"(.*?)"/g);
        if(chatMatch) {
            console.log("--> INGRESO DEL USUARIO:");
            console.log(chatMatch.map(c => c.substring(13, c.length-1)).join('\\n'));
        }

        const teleLines = raw.split('"node":"cargar_telemetria"');
        for(let i=1; i<teleLines.length; i++) {
           console.log("--> EJECUCIÓN DE TELEMETRÍA:");
           
           // Search for error or response
           const jsonStr = teleLines[i].substring(0, 3000);
           const mJson = jsonStr.match(/"json":(\{.*?\})/);
           if(mJson) console.log("   PAYLOAD:", mJson[1] );
           
           const errStr = jsonStr.match(/"error":(\{.*?\})/);
           if(errStr) console.log("   ERROR:", errStr[1] );
        }

        const agentLines = raw.split('"node":"AI Agent');
        for(let i=1; i<agentLines.length; i++) {
           const jsonStr = agentLines[i].substring(0, 3000);
           const mObj = jsonStr.match(/"output":"(.*?)"/);
           if(mObj) console.log("--> RESPUESTA IA:", mObj[1].replace(/\\n/g, '\\n    '));
        }

    } catch(e) {}
});
