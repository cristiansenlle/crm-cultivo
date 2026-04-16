const fs = require('fs');
const exe = JSON.parse(fs.readFileSync('THE_NEWEST_exe_trace.json', 'utf8'));

// Dig through execution data
console.log("Looking for consultar_lotes results and Groq prompts...");

let groqPrompt = null;
let loteResult = null;

for (const [nodeName, nodeRuns] of Object.entries(exe.resultData.runData)) {
    for (const run of nodeRuns) {
        if (nodeName.includes('Groq')) {
            // Langchain agent trace
            console.log(`\n--- Node: ${nodeName} ---`);
            const inputData = run.data.main[0][0];
            if (inputData && inputData.json) {
                console.log("Input to Groq:", JSON.stringify(inputData.json).substring(0, 500));
            }
        }
        if (nodeName.includes('consultar_lotes')) {
            console.log(`\n--- Node: ${nodeName} ---`);
            const outputData = run.data.main[0][0];
            if (outputData && outputData.json) {
                console.log("Output of consultar_lotes:", JSON.stringify(outputData.json).substring(0, 500));

                const responseData = outputData.json.response || outputData.json;
                console.log("\nFull Output:", JSON.stringify(responseData));
            }
        }
        if (nodeName.includes('AI Agent') || nodeName.includes('Agent')) {
            console.log(`\n--- Node: ${nodeName} ---`);
            if (run.data.main[0][0]) {
                console.log("Agent output:", JSON.stringify(run.data.main[0][0].json).substring(0, 1000));
            }
        }
    }
}
