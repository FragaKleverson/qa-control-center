export default function GherkinDisplay({ testCase }) {
  const parseGherkin = (text) => {
    if (!text) return [];
    
    const lines = text.split('\n').filter(line => line.trim());
    const steps = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().startsWith('given ')) {
        steps.push({ type: 'given', content: trimmed.substring(6).trim() });
      } else if (trimmed.toLowerCase().startsWith('when ')) {
        steps.push({ type: 'when', content: trimmed.substring(5).trim() });
      } else if (trimmed.toLowerCase().startsWith('then ')) {
        steps.push({ type: 'then', content: trimmed.substring(5).trim() });
      } else if (trimmed.toLowerCase().startsWith('and ')) {
        if (steps.length > 0) {
          steps.push({ 
            type: steps[steps.length - 1].type, 
            content: trimmed.substring(4).trim(),
            isAnd: true 
          });
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
        <div>
          {steps.map((step, idx) => (
            <div 
              key={idx} 
              className={`gherkin-step gherkin-${step.type}`}
              style={{
                marginLeft: step.isAnd ? '20px' : '0'
              }}
            >
              <div className="gherkin-content">
                {step.content}
              </div>
            </div>
          ))}
        </div>
      ) : testCase?.passos ? (
        <div className="gherkin-step" style={{ borderLeftColor: '#9ca3af' }}>
          <div className="gherkin-content">
            {testCase.passos}
          </div>
        </div>
      ) : (
        <p style={{ color: '#9ca3af', fontSize: '14px' }}>Nenhum passo definido</p>
      )}
    </div>
  );
}
