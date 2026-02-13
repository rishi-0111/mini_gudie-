import os, re
from collections import Counter

supabase_dir = r'd:\miniguide\supabase'

for f in sorted(os.listdir(supabase_dir)):
    if f.endswith('.sql') and f.startswith('seed'):
        path = os.path.join(supabase_dir, f)
        with open(path, 'r', encoding='utf-8') as fh:
            content = fh.read()
        cats = Counter()
        for m in re.findall(r"\d+\.\d+, '([a-z_]+)',", content):
            cats[m] += 1
        if cats:
            cats_str = ', '.join(f'{k}={v}' for k, v in cats.most_common())
            print(f'{f:<35} {cats_str}')
