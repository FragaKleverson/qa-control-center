import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

base = r'c:\Users\kcosta\qa-control-center\frontend\src\pages'
for fname in ['Executions.jsx', 'TestSuites.jsx', 'TestPlan.jsx']:
    path = base + '\\' + fname
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    print(f'\n=== {fname} ===')
    for i, line in enumerate(lines, 1):
        if '\ufffd' in line or (line.count('?') > 2 and i < 20):
            # Show hex of first 80 chars
            hex_repr = ' '.join(f'{ord(c):04x}' for c in line[:80])
            print(f'  line {i}:')
            print(f'    text: {repr(line.rstrip()[:100])}')
            print(f'    hex:  {hex_repr[:120]}')
