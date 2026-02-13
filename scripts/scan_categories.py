import os, re
from collections import Counter

supabase_dir = r'd:\miniguide\supabase'
categories = Counter()

for f in os.listdir(supabase_dir):
    if f.endswith('.sql') and f.startswith('seed'):
        path = os.path.join(supabase_dir, f)
        with open(path, 'r', encoding='utf-8') as fh:
            content = fh.read()
        for m in re.findall(r"\d+\.\d+, '([a-z_]+)',", content):
            categories[m] += 1

print('Category values across all seed files:')
for cat, count in categories.most_common():
    print(f'  {cat:<20} {count:>6}')
print(f'\nTotal unique: {len(categories)}')
