import { render } from '@testing-library/preact';
import { App } from '../../src/app';
test('app renders', () => { const { container } = render(<App />); expect(container.textContent).not.toBe(''); });
