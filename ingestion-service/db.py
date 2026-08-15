import psycopg2
    
db = psycopg2.connect(
        host='postgres',
        database='freshtrack',
        user='freshtrack',
        password='freshtrack',
        port='5432'
    )