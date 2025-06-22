import psycopg2
import os

def get_db_connection():
    return psycopg2.connect(
        dbname=os.getenv('DB_NAME', 'sistema_estudos'),
        user=os.getenv('DB_USERNAME', 'postgres'),
        password=os.getenv('DB_PASSWORD', '1234'),
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5432')
    )
