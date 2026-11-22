import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STYLESHEET_RETRY_KEY, stylesheetRetryScript } from './stylesheet-retry';

const failLink = (href: string, rel = 'stylesheet') => {
  const link = document.createElement('link');
  link.rel = rel;
  link.href = href;
  document.head.appendChild(link);
  link.dispatchEvent(new Event('error'));
};

describe('stylesheet retry', () => {
  let reload: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    sessionStorage.clear();
    reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, origin: window.location.origin, reload });
    // eslint-disable-next-line no-new-func
    new Function(stylesheetRetryScript)();
  });
  afterEach(() => { vi.unstubAllGlobals(); document.head.innerHTML = ''; });

  it('reloads once when the site’s own stylesheet fails to load', () => {
    failLink(`${window.location.origin}/assets/styles-OLD.css`);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(STYLESHEET_RETRY_KEY)).toBe('1');
    failLink(`${window.location.origin}/assets/styles-OLD.css`);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('after load, reloads for a site stylesheet that failed before it was listening', () => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${window.location.origin}/assets/styles-OLD.css`;
    document.head.appendChild(link);
    window.dispatchEvent(new Event('load'));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('ignores other sites’ stylesheets and other links', () => {
    failLink('https://fonts.googleapis.com/css2?family=x');
    failLink(`${window.location.origin}/assets/icon.png`, 'icon');
    expect(reload).not.toHaveBeenCalled();
  });
});
