// Renderiza os passos Gherkin de um cenário com coloração por tipo (given/when/then)
export default function GherkinDisplay({ testCase }) {
  // Converte texto Gherkin livre em array de steps tipados
  const parseGherkin = (text) => {
    if (!text) return [];
    
    const lines = text.split('\n').filter(line => line.trim());
    const steps = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      const lower = trimmed.toLowerCase();

      if (lower.startsWith('given ') || lower.startsWith('dado que ') || lower.startsWith('dado ')) {
        const prefix = lower.startsWith('dado que ') ? 9 : lower.startsWith('dado ') ? 5 : 6;
        steps.push({ type: 'given', keyword: trimmed.substring(0, prefix).trim(), content: trimmed.substring(prefix).trim() });
      } else if (lower.startsWith('when ') || lower.startsWith('quando ')) {
        const prefix = lower.startsWith('quando ') ? 7 : 5;
        steps.push({ type: 'when', keyword: trimmed.substring(0, prefix).trim(), content: trimmed.substring(prefix).trim() });
      } else if (lower.startsWith('then ') || lower.startsWith('então ') || lower.startsWith('entao ')) {
        const prefix = lower.startsWith('então ') || lower.startsWith('entao ') ? 6 : 5;
        steps.push({ type: 'then', keyword: trimmed.substring(0, prefix).trim(), content: trimmed.substring(prefix).trim() });
      } else if (lower.startsWith('and ') || lower.startsWith('e ')) {
        if (steps.length > 0) {
          const prefix = lower.startsWith('and ') ? 4 : 2;
          steps.push({ 
            type: steps[steps.length - 1].type, 
            keyword: trimmed.substring(0, prefix).trim(),
            content: trimmed.substring(prefix).trim(),
            isAnd: true 
          });
        }
      } else {
        // linha sem keyword reconhecida — adiciona como continuação do último step ou step genérico
        if (steps.length > 0) {
          steps[steps.length - 1].content += ' ' + trimmed;
        } else {
          steps.push({ type: 'generic', keyword: '', content: trimmed });
        }
      }
    });
    
    return steps;
  };

  const steps = parseGherkin(testCase?.passos || '');

  return (
    <div className="test-case-display">
      <h4>🧪 {testCase?.nome || 'Test Case'}</h4>
      
      {testCase?.tipo && (
        <div style={{ marginBottom: '12px' }}>
          <span style={{
            display: 'inline-block',
            background: '#8b5cf6',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            {testCase.tipo}
          </span>
        </div>
      )}

      {steps.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {steps.map((step, idx) => (
            <div 
              key={idx} 
              className={`gherkin-step gherkin-${step.type}`}
              style={{ marginLeft: step.isAnd ? '20px' : '0' }}
            >
              <div className="gherkin-content">
                {step.keyword && (
                  <span style={{ fontWeight: '700', marginRight: '6px' }}>
                    {step.keyword}
                  </span>
                )}
                {step.content}
              </div>
            </div>
          ))}
        </div>
      ) : testCase?.passos ? (
        <div className="gherkin-step" style={{ borderLeftColor: '#9ca3af' }}>
          <div className="gherkin-content" style={{ whiteSpace: 'pre-wrap' }}>
            {testCase.passos}
          </div>
        </div>
      ) : (
        <p style={{ color: '#9ca3af', fontSize: '14px' }}>Nenhum passo definido</p>
      )}
    </div>
  );
}
