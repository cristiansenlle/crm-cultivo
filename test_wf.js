
const fs = require('fs');
const { Workflow } = require('/usr/lib/node_modules/n8n/node_modules/n8n-workflow/dist/Workflow.js');

try {
  const t = JSON.parse(fs.readFileSync('/tmp/db_clean.json', 'utf8'));
  const wfData = t.nodes ? t : t[0];
  
  // Construct a pseudo-workflow to test getParentNodes
  const workflow = new Workflow({
    nodes: wfData.nodes,
    connections: wfData.connections,
    active: true,
    nodeTypes: {
      getByNameAndVersion: () => ({ description: {} })
    }
  });
  
  const res1 = workflow.getParentNodes('AI Agent (Function Calling)', 'main', 1);
  console.log('AI Agent main parents:', res1);

  const res2 = workflow.getParentNodes('AI Agent (Groq Fallback)', 'main', 1);
  console.log('AI Agent Groq Fallback main parents:', res2);

  // Tools Agent V1 executes: getConnectedNodes('ai_tool') -> getParentNodes('...', 'ai_tool', 1)
  const res3 = workflow.getParentNodes('AI Agent (Function Calling)', 'ai_tool', 1);
  console.log('AI Agent ai_tool parents:', res3);
  
} catch (e) {
  console.error(e);
}
