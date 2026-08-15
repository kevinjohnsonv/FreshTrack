from fastapi import FastAPI
from db import db
from psycopg2.extras import RealDictCursor

app = FastAPI()

@app.get('/health')
def health_check():
    return {'status': 'ok'}

@app.get('/anomalies')
def get_anomalies():
    cur = db.cursor(cursor_factory=RealDictCursor)

    cur.execute("""WITH recent_counts AS (SELECT restraunt, count(*) as recent_issues FROM order_events where event_type IN ('order_cancelled', 'merchant_prep_delayed', 'driver_unavailable', 'driver_delayed_in_transit') 
                        AND created_at> (NOW() - INTERVAL '30 minutes') GROUP BY restraunt), 

                    baseline_counts AS (SELECT restraunt, count(*) as baseline_issues FROM order_events where event_type IN ('order_cancelled', 'merchant_prep_delayed', 'driver_unavailable', 'driver_delayed_in_transit') 
                        AND created_at < (NOW() - INTERVAL '30 minutes') GROUP BY restraunt) 

                    SELECT baseline_counts.restraunt, COALESCE(recent_counts.recent_issues, 0) as recent_issues, baseline_counts.baseline_issues AS baseline_issues
                    FROM baseline_counts LEFT JOIN recent_counts ON recent_counts.restraunt = baseline_counts.restraunt 
                    WHERE recent_issues > (3 * (baseline_issues / 48));""")

    results = cur.fetchall()
    cur.close()

    return results