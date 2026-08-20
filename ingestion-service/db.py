import psycopg2
import os
    
db = psycopg2.connect(
        host=os.environ.get('DB_HOST', 'localhost'),
        database='freshtrack',
        user='freshtrack',
        password='freshtrack',
        port='5432'
    )