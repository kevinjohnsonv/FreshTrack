import json
from datetime import datetime, timedelta
import random
import redis

RESTRAUNTS = ['The Fry Shack', 'Sizzle Burger', 'Wing Central', 'Taco Turbo', 'Salsa Express', 'The Sub Hub', 'The Snack Shack', 'Burrito Box', 'The Fish Fryer', 'Egg & Go']
DRIVERS = ['Arthur Pendelton', 'Harvey Brooks', 'Liam Vance', 'Harper Hayes', 'Eleanor Sterling', 'Zara Cross', 'Jax Thorne', 'Leo Montgomery', 'Ivy Thorne', 'Isla Stark']
EVENTS = ['order_created','order_sent','order_ready', 'driver_assigned', 'driver_headed_to_merchant', 'order_picked_up', 'driver_enroute_to_drop_off', 'delivery_completed']
ISSUE_EVENTS = ['order_cancelled', 'merchant_prep_delayed', 'driver_unavailable', 'driver_delayed_in_transit']
EVENT_ISSUE_PAIRS = {
    'order_created': ['order_cancelled'],
    'order_sent': ['order_cancelled', 'merchant_prep_delayed'],
    'order_ready': ['driver_unavailable'],
    'driver_enroute_to_drop_off': ['driver_delayed_in_transit']
}
EVENT_TIMES = {
    'order_sent': (10,20),
    'order_ready': (3,7),
    'driver_assigned': (5,10),
    'driver_headed_to_merchant': (1,3),
    'order_picked_up': (0, 0),
    'driver_enroute_to_drop_off': (7,15)
}
ISSUE_EVENT_TIMES = {
    'merchant_prep_delayed': (5, 10),
    'driver_unavailable': (3,7),
    'driver_delayed_in_transit': (5,15)
}
ORDER_CREATION_INTERVAL = (1,3)
TERMINAL_STATES = ['delivery_completed', 'order_cancelled']

r = redis.Redis(host='localhost', port=6379)

orders = {}

def create_order(order_number: int):
    order_event = create_json_event(order_number, EVENTS[0], random.choice(RESTRAUNTS))

    orders[order_number] = {'event_type': order_event['event_type'], 'restraunt': order_event['restraunt'], 'ready_at': datetime.now()}

    return (order_event)

def push_order(json_order: dict):

    if json_order['event_type'] in EVENTS:
        r.lpush('events', json.dumps(json_order))
    elif json_order['event_type'] in ISSUE_EVENTS:
        r.lpush('issues', json.dumps(json_order))

def advance_order(order_number: int):
    
    order_event_idx = EVENTS.index(orders[order_number]['event_type'])

    order_event = create_json_event(order_number, EVENTS[order_event_idx + 1], orders[order_number]['restraunt'])

    orders[order_number]['event_type'] = order_event['event_type']

    if order_event['event_type'] in EVENT_TIMES:
        orders[order_number]['ready_at'] = datetime.now() + timedelta(seconds=random.randint(EVENT_TIMES[order_event['event_type']][0], EVENT_TIMES[order_event['event_type']][1]))

    return (order_event)

def create_issue_event(order_number: int, issue_event: str, restraunt: str):
    return create_json_event(order_number, issue_event, restraunt)

def create_json_event(order_number: int, event_type: str, restraunt: str):
    order_event = {}

    order_event['order_id'] = 'ft-' + str(order_number)
    order_event['event_type'] = event_type
    order_event['restraunt'] = restraunt
    order_event['created_at'] = datetime.now().replace(microsecond=0).isoformat()

    return order_event

def order_generator():

    order_count = 1

    new_order_time = datetime.now() + timedelta(seconds=random.randint(ORDER_CREATION_INTERVAL[0], ORDER_CREATION_INTERVAL[1]))

    orders_to_be_del = set()

    while order_count < 10 or len(orders) > 0:

        current_time = datetime.now()

        if current_time > new_order_time and order_count < 10:
            push_order(create_order(order_count))
            
            order_count += 1

            new_order_time = datetime.now() + timedelta(seconds=random.randint(ORDER_CREATION_INTERVAL[0], ORDER_CREATION_INTERVAL[1]))
        
        for order_number, details in orders.items():

            if current_time > details['ready_at']:
                if details['event_type'] in EVENT_ISSUE_PAIRS:
                    issue_odds = random.randint(1,100)

                    issue_event = random.choice(EVENT_ISSUE_PAIRS[details['event_type']])

                    if issue_odds > 97:
                        if issue_event != 'order_cancelled':
                            details['ready_at'] += timedelta(seconds=random.randint(ISSUE_EVENT_TIMES[issue_event][0], ISSUE_EVENT_TIMES[issue_event][1]))
                        else:
                            details['event_type'] = 'order_cancelled'
                        push_order(create_issue_event(order_number, issue_event, details['restraunt']))
                    else:
                        push_order(advance_order(order_number))
                else:
                    push_order(advance_order(order_number))
            
            if details['event_type'] in TERMINAL_STATES:
                orders_to_be_del.add(order_number)

        for order_number in orders_to_be_del:
            del orders[order_number]

        orders_to_be_del.clear()

order_generator()