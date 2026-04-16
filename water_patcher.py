import sqlite3
import sys

def main():
    print("Conectando a base de n8n VPS 144...")
    try:
        conn = sqlite3.connect('/home/node/.n8n/database.sqlite')
        cursor = conn.cursor()
        cursor.execute("SELECT id, nodes FROM workflow_entity WHERE id='AkimB7aNdbNxFbcQ'")
        row = cursor.fetchone()
        
        if not row:
            print("Workflow no encontrado!")
            sys.exit(1)
            
        nodes_str = row[1]
        
        old_str = 'Litros totales de agua usados para dilui.'
        new_str = 'Litros totales de agua usados para diluir (OPCIONAL. Si el usuario no lo menciona, asume 0 al instante, no preguntes de nuevo).'
        
        patched_nodes_str = nodes_str.replace(old_str, new_str)
        
        cursor.execute("UPDATE workflow_entity SET nodes = ? WHERE id='AkimB7aNdbNxFbcQ'", (patched_nodes_str,))
        conn.commit()
        conn.close()
        print("PROMPT RELAJADO EN DB!")
        
    except Exception as e:
        print("Error:", str(e))
        sys.exit(1)

if __name__ == "__main__":
    main()
