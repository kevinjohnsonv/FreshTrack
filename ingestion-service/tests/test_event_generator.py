from event_generator import advance_order, orders, create_json_event
from datetime import datetime, timezone
import fakeredis
import event_generator

def test_advance_order():

    orders[1] = {'event_type': 'order_created', 'restaurant': 'Test Restaurant', 'ready_at': datetime.now(timezone.utc)}
    orders[2] = {'event_type': 'driver_enroute_to_drop_off', 'restaurant': 'Test Restaurant', 'ready_at': datetime.now(timezone.utc)}

    ready_at_before = orders[2]['ready_at']

    result1 = advance_order(1)
    result2 = advance_order(2)

    assert result1['event_type'] == 'order_sent'
    assert orders[1]['event_type'] == 'order_sent'

    assert result2['event_type'] == 'delivery_completed'
    assert orders[2]['event_type'] == 'delivery_completed'
    assert orders[2]['ready_at'] == ready_at_before 

def test_push_order():
    event_generator.r = fakeredis.FakeRedis()

    event_generator.push_order({'event_type': 'order_created', 'order_id': 'ft-1234'})
    event_generator.push_order({'event_type': 'driver_unavailable', 'order_id': 'ft-12345'})

    events_queue = event_generator.r.lrange('events', 0, -1)
    issues_queue = event_generator.r.lrange('issues', 0, -1)
    assert len(events_queue) == 1
    assert len(issues_queue) == 1

def test_create_json_object():

    required_keys = ['order_id', 'event_type', 'restaurant', 'created_at']

    order_number = 543
    restaurant = 'Test Restaurant'
    event_type = 'order_created'

    test_object = create_json_event(order_number, event_type, restaurant)

    assert all(key in test_object for key in required_keys)