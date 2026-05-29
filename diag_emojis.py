import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

base = r'c:\Users\kcosta\qa-control-center\frontend\src\pages'
for fname in ['Executions.jsx', 'TestSuites.jsx', 'TestPlan.jsx']:
    path = base + '\\' + fname
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    print(f'\n=== {fname} ===')
    for i, line in enumerate(lines, 1):
        if '\ufffd' in line:
            print(f'  line {i}: {repr(line.rstrip())}')
