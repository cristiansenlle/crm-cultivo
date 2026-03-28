
import sqlite3
import json

db = sqlite3.connect('/root/.n8n/database.sqlite')
cursor = db.cursor()

# Check if exists
cursor.execute("SELECT id FROM workflow_entity WHERE id = 'scpZdPe5Cp4MG98G'")
if not cursor.fetchone():
    # Insert dummy first
    cursor.execute("INSERT INTO workflow_entity (id, name, active, nodes, connections, createdAt, updatedAt, settings, staticData, pinData, versionId) VALUES ('scpZdPe5Cp4MG98G', 'CRM Cannabis', 1, X'00', X'00', datetime('now'), datetime('now'), '{}', '{}', '{}', 1)")
    db.commit()

# Read HEX from file
with open('/opt/crm-cannabis/restore_nodes.hex', 'r') as f:
    hex_data = f.read()

# Update nodes and force version refresh
cursor.execute("UPDATE workflow_entity SET nodes = X'" + hex_data + "', updatedAt = datetime('now'), versionId = versionId + 1 WHERE id = 'scpZdPe5Cp4MG98G'")
db.commit()
db.close()
print('Workflow restored and updated.')
