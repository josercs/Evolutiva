import psycopg2
import os
from models.models import db

def get_db_connection():
    return psycopg2.connect(
        dbname=os.getenv('DB_NAME', 'sistema_estudos'),
        user=os.getenv('DB_USERNAME', 'postgres'),
        password=os.getenv('DB_PASSWORD', '1234'),
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5432')
    )

if __name__ == "__main__":
    try:
        conn = get_db_connection()
        print("Conexão OK:", conn.get_dsn_parameters())
        conn.close()
    except Exception as e:
        print("Erro ao conectar:", e)
