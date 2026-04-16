import sqlite3
import sys

def main():
    print("Conectando a base de n8n...")
    try:
        conn = sqlite3.connect('/home/node/.n8n/database.sqlite')
        cursor = conn.cursor()
        cursor.execute("SELECT id, nodes FROM workflow_entity WHERE id='AkimB7aNdbNxFbcQ'")
        row = cursor.fetchone()
        
        if not row:
            print("Workflow no encontrado!")
            sys.exit(1)
            
        nodes_str = row[1]
        
        # REVERSION a la IP correcta del VPS 109 donde corre el Backend del Bot
        patched_nodes_str = nodes_str.replace('144.126.216.51', '109.199.99.126')
        
        if patched_nodes_str == nodes_str:
            print("Ya estaba revertido o no se encontró 144.126...")
            sys.exit(0)
            
        cursor.execute("UPDATE workflow_entity SET nodes = ? WHERE id='AkimB7aNdbNxFbcQ'", (patched_nodes_str,))
        conn.commit()
        conn.close()
        print("DATABASE REVERTIDA SUCCESS!")
        
    except Exception as e:
        print("Error:", str(e))
        sys.exit(1)

if __name__ == "__main__":
    main()
