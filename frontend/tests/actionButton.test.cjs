const fs = require('node:fs');
const path = require('node:path');
const React = require('../../backend/node_modules/react');
const { renderToStaticMarkup } = require('../../backend/node_modules/react-dom/server');
const { loadActionButton } = require('./actionButtonLoader.cjs');
let ActionButton;
beforeAll(async () => {
  const module = await loadActionButton();
  await module.evaluate();
  ActionButton = module.namespace.default;
});
it.each([['view', 'Visualizar'], ['edit', 'Editar'], ['delete', 'Excluir'], ['restore', 'Restaurar']])('%s has a visible Portuguese label, decorative icon and shared style', (action, label) => {
  const html = renderToStaticMarkup(React.createElement(ActionButton, { action }));
  expect(html).toContain(`action-button--${action}`);
  expect(html).toContain(`<span>${label}</span>`);
  expect(html).toContain('type="button"');
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('focusable="false"');
  expect(html).not.toContain('style=');
});
it('preserves accessible context, loading label, disabled state and handler', () => {
  const onClick = jest.fn();
  const button = ActionButton({ action: 'delete', 'aria-label': 'Excluir TC0042', disabled: true, children: 'Excluindo...', onClick });
  expect(button.props.disabled).toBe(true);
  expect(button.props.onClick).toBe(onClick);
  expect(button.props['aria-label']).toBe('Excluir TC0042');
  const html = renderToStaticMarkup(button);
  expect(html).toContain('disabled=""');
  expect(html).toContain('Excluindo...');
});
it('centralizes red danger, shared sizing, wrapping, focus and disabled interaction rules', () => {
  const css = fs.readFileSync(path.join(__dirname, '../src/components/ActionButton.css'), 'utf8');
  expect(css).toMatch(/\.action-button--delete\s*\{[^}]*--action-background:\s*#dc2626/);
  expect(css).toContain('min-height: 40px');
  expect(css).toContain(':focus-visible');
  expect(css).toContain(':hover:not(:disabled)');
  expect(css).toContain('flex-wrap: wrap');
  expect(css).toContain('max-width: 100%');
});
it.each(['Projects','TestCases','Requirements','TestSuites','TestPlan','Executions'])('%s uses shared actions and has no visible Delete label', page => {
  const code = fs.readFileSync(path.join(__dirname, `../src/pages/${page}.jsx`), 'utf8');
  expect(code).toContain('import ActionButton');
  expect(code).not.toMatch(/>\s*Delete\s*</);
  expect(code).toMatch(/action[:=]\s*["']delete["']/);
});
