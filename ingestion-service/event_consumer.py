import json
import redis
import psycopg2
from db import db

r = redis.Redis(host='localhost', port=6379)

def create_event_table():
    cur = db.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS order_events(
            id SERIAL PRIMARY KEY,
            order_id VARCHAR(30),
            event_type VARCHAR(30),
            restaurant VARCHAR(30),
            created_at TIMESTAMPTZ
        );
    """)

    db.commit()
    cur.close()

def upload_order(order_event: dict):
    cur = db.cursor()

    cur.execute("""
        INSERT INTO order_events (order_id, event_type, restaurant, created_at)
        VALUES (%s, %s, %s, %s)
    """, (order_event['order_id'], order_event['event_type'], order_event['restaurant'], order_event['created_at'],))

    db.commit()
    cur.close()


def event_consumer():

    create_event_table()

    while True:
        
        order_event_popped = r.rpop('events')
        order_issue_popped = r.rpop('issues')

        if order_event_popped is not None:
            upload_order(json.loads(order_event_popped))

        if order_issue_popped is not None:
            upload_order(json.loads(order_issue_popped))

event_consumer()