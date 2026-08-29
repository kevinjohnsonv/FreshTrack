from fastapi import FastAPI
from db import db
from psycopg2.extras import RealDictCursor
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

class AlertItem(BaseModel):
    message: str
    restaurant: str
    severity: str
    time: str


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get('/health')
def health_check():
    return {'status': 'ok'}

@app.get('/anomalies')
def get_anomalies():
    cur = db.cursor(cursor_factory=RealDictCursor)

    cur.execute("""WITH recent_counts AS (SELECT restaurant, count(*) as recent_issues FROM order_events where event_type IN ('order_cancelled', 'merchant_prep_delayed', 'driver_unavailable', 'driver_delayed_in_transit') 
                        AND created_at> (NOW() - INTERVAL '30 minutes') GROUP BY restaurant), 

                    baseline_counts AS (SELECT restaurant, count(*) as baseline_issues FROM order_events where event_type IN ('order_cancelled', 'merchant_prep_delayed', 'driver_unavailable', 'driver_delayed_in_transit') 
                        AND created_at < (NOW() - INTERVAL '30 minutes') AND created_at > (NOW() - INTERVAL '24 hours 30 minutes') GROUP BY restaurant) 

                    SELECT baseline_counts.restaurant, COALESCE(recent_counts.recent_issues, 0) as recent_issues, baseline_counts.baseline_issues AS baseline_issues, baseline_issues::decimal / 48 AS baseline_rate_30min
                    FROM baseline_counts LEFT JOIN recent_counts ON recent_counts.restaurant = baseline_counts.restaurant 
                    WHERE recent_issues > (3 * (baseline_issues::decimal / 48));""")

    results = cur.fetchall()
    cur.close()
    db.commit()

    return results

@app.get('/summary')
def get_order_summary():
    cur = db.cursor(cursor_factory=RealDictCursor)

    cur.execute("""
        SELECT restaurant, COUNT(*) as order_count FROM order_events WHERE created_at > (NOW() - INTERVAL '1 hour') AND event_type='order_created' GROUP BY restaurant;
    """)

    results = cur.fetchall()

    cur.close()
    db.commit()

    return results

@app.post('/alerts')
def post_alerts(data: AlertItem):
    cur = db.cursor()

    cur.execute("""
        INSERT INTO alert_history (message, restaurant, severity, created_at) VALUES (%s, %s, %s, %s)
    """, (data.message, data.restaurant, data.severity, data.time))

    db.commit()
    cur.close()

@app.get('/alerts')
def get_alert_history():
    cur = db.cursor(cursor_factory=RealDictCursor)

    cur.execute("""
        SELECT message, restaurant, severity, created_at FROM alert_history ORDER BY created_at DESC LIMIT 25;
    """)

    results = cur.fetchall()

    cur.close()
    db.commit()

    return results