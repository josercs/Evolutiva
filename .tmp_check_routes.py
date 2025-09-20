import importlib.util, sys
from pathlib import Path
p = Path('backend/src/main.py')
print('Loading', p)
spec = importlib.util.spec_from_file_location('main', str(p))
m = importlib.util.module_from_spec(spec)
sys.modules['main'] = m
try:
    spec.loader.exec_module(m)
    print('Loaded. Routes:', len(list(m.app.url_map.iter_rules())))
    for r in sorted({rule.rule for rule in m.app.url_map.iter_rules()}):
        print(r)
except Exception as e:
    print('ERR:', e)
