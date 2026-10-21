import { render, screen, fireEvent } from '@testing-library/preact';
import { IosTip } from '../../src/ui/IosTip';
import { loadSettings } from '../../src/settings/settings';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const setUA = (ua: string) => vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);
afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

test('shows on iPhone, dismiss saves iosTipSeen', () => {
  setUA(IPHONE);
  const { unmount } = render(<IosTip />);
  expect(screen.getByText(/Add to Home Screen/)).toBeTruthy();
  fireEvent.click(screen.getByLabelText('Dismiss'));
  expect(screen.queryByText(/Add to Home Screen/)).toBeNull();
  expect(loadSettings().iosTipSeen).toBe(true);
  unmount();
  render(<IosTip />);
  expect(screen.queryByText(/Add to Home Screen/)).toBeNull();
});
test('hidden on non-iOS', () => {
  render(<IosTip />);
  expect(screen.queryByText(/Add to Home Screen/)).toBeNull();
});
test('hidden when standalone', () => {
  setUA(IPHONE);
  Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
  render(<IosTip />);
  expect(screen.queryByText(/Add to Home Screen/)).toBeNull();
  delete (navigator as unknown as Record<string, unknown>).standalone;
});
