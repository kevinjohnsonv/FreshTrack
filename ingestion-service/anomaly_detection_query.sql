WITH recent_counts AS (SELECT restaurant, count(*) as recent_issues FROM order_events where event_type IN ('order_cancelled', 'merchant_prep_delayed', 'driver_unavailable', 'driver_delayed_in_transit') 
    AND created_at> (NOW() - INTERVAL '30 minutes') GROUP BY restaurant), 

baseline_counts AS (SELECT restaurant, count(*) as baseline_issues FROM order_events where event_type IN ('order_cancelled', 'merchant_prep_delayed', 'driver_unavailable', 'driver_delayed_in_transit') 
    AND created_at < (NOW() - INTERVAL '30 minutes') GROUP BY restaurant) 

SELECT baseline_counts.restaurant, COALESCE(recent_counts.recent_issues, 0) as recent_issues, baseline_counts.baseline_issues 
FROM baseline_counts LEFT JOIN recent_counts ON recent_counts.restaurant = baseline_counts.restaurant 
WHERE recent_issues > (3 * (baseline_issues / 48));