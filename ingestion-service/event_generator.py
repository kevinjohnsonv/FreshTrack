import json
from datetime import datetime
import random
import redis

RESTRAUNTS = ['The Fry Shack', 'Sizzle Burger', 'Wing Central', 'Taco Turbo', 'Salsa Express', 'The Sub Hub', 'The Snack Shack', 'Burrito Box', 'The Fish Fryer', 'Egg & Go']
DRIVERS = ['Arthur Pendelton', 'Harvey Brooks', 'Liam Vance', 'Harper Hayes', 'Eleanor Sterling', 'Zara Cross', 'Jax Thorne', 'Leo Montgomery', 'Ivy Thorne', 'Isla Stark']
EVENTS = ['order_created','order_sent','order_ready', 'driver_assigned', 'driver_headed_to_merchant', 'order_picked_up', 'driver_enroute_to_drop_off', 'delivery_completed']
ISSUE_EVENTS = ['order_cancelled', 'merchant_prep_delayed', 'driver_unavailable', 'driver_delayed_in_transit']

r = redis.Redis(host='localhost', port=6379)

orders = {}

def create_order(order_number: int):
    order_event = {}

    order_event['order_id'] = 'ft-' + str(order_number)
    order_event['event_type'] = EVENTS[0]
    order_event['created_at'] = datetime.now().replace(microsecond=0).isoformat()
    order_event['restraunt'] = random.choice(RESTRAUNTS)

    orders[order_number] = {'event_type': order_event['event_type'], 'restraunt': order_event['restraunt']}

    return (order_event)

def push_order(json_order: dict):

    if json_order['event_type'] in EVENTS:
        r.lpush('events', json.dumps(json_order))
    elif json_order['event_type'] in ISSUE_EVENTS:
        r.lpush('issues', json.dumps(json_order))

def advance_order(order_number: int):
    order_event = {}

    order_event_idx = EVENTS.index(orders[order_number]['event_type'])

    order_event['order_id'] = 'ft-' + str(order_number)
    order_event['event_type'] = EVENTS[order_event_idx + 1]
    order_event['created_at'] = datetime.now().replace(microsecond=0).isoformat()
    order_event['restraunt'] = orders[order_number]['restraunt']

    orders[order_number]['event_type'] = order_event['event_type']

    return (order_event)