import os, re
from collections import Counter

d = r'd:\miniguide\supabase'

for f in sorted(os.listdir(d)):
    if f.endswith('.sql') and f.startswith('seed'):
        c = open(os.path.join(d, f), encoding='utf-8').read()
        cats = set(re.findall(r"'(temple|hospital|emergency|hidden_spot|hostel|restaurant|hotel|landmark|tourist|bus_station|metro|pharmacy|police|fire_station|railway|transport|health_centre|destination|worship|viewpoint|bus_route|ride_service)'", c))
        if not cats:
            # Try category column value — after a number and comma
            cats = set(re.findall(r", '([a-z_]+)', '", c))
        if cats:
            print(f'{f:<35} {cats}')
        else:
            print(f'{f:<35} (no categories found)')
