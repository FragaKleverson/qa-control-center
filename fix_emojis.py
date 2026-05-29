import re

R = '\ufffd'
base = r'c:\Users\kcosta\qa-control-center\frontend\src\pages'

# Mapeamento por arquivo: lista de (regex_pattern, replacement)
# Usa \ufffd+ para capturar sequências de replacement chars
replacements = {
    'Executions.jsx': [
        (r'\ufffd+ Test Executions',      '🚀 Test Executions'),
        (r'label: "\ufffd+ Pending"',     'label: "⏸️ Pending"'),
        (r'label: "\ufffd+ Running"',     'label: "⏳ Running"'),
        (r'label: "\ufffd+ Passed"',      'label: "✅ Passed"'),
        (r'label: "\ufffd+ Failed"',      'label: "❌ Failed"'),
        (r'label: "\ufffd+ Blocked"',     'label: "🚫 Blocked"'),
        (r'label: "\ufffd+ Skipped"',     'label: "⏭️ Skipped"'),
        (r'\ufffd+ Run Suite',            '▶️ Run Suite'),
        (r'\ufffd+ Fechar"',              '▲ Fechar"'),
        (r'\ufffd+ Ver Cases"',           '▼ Ver Cases"'),
        (r'\ufffd+ Test Cases \(',        '🧪 Test Cases ('),
        (r'\ufffd+ Ver"',                 '🔍 Ver"'),
    ],
    'TestSuites.jsx': [
        (r'\ufffd+ Test Suites',          '📦 Test Suites'),
        (r'\ufffd+ Manage Cases',         '🧪 Manage Cases'),
        (r'\ufffd+ \{tc\.titulo\}',       '✅ {tc.titulo}'),
        (r'Test Cases — \{',             'Test Cases — {'),
        (r'Test Cases \ufffd+ \{',        'Test Cases — {'),
    ],
    'TestPlan.jsx': [
        (r'\ufffd+ Test Plans',           '📋 Test Plans'),
        (r'\ufffd+ Manage Suites',        '📦 Manage Suites'),
        (r'\ufffd+ Execute"',             '▶️ Execute"'),
        (r'\ufffd+ \{suite\.nome\}',      '✅ {suite.nome}'),
        (r'Suites — \{',                 'Suites — {'),
        (r'Suites \ufffd+ \{',           'Suites — {'),
    ],
}

for fname, rules in replacements.items():
    path = base + '\\' + fname
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    for pattern, replacement in rules:
        new_content = re.sub(pattern, replacement, content)
        if new_content != content:
            print(f'  [OK] {pattern[:50]} -> {replacement}')
            content = new_content

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

    remaining = content.count('\ufffd')
    changed = content != original
    print(f'{fname}: {"CHANGED" if changed else "no change"}, {remaining} replacement chars remaining')
