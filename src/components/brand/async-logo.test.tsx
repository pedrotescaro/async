import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AsyncLogo } from './async-logo';

describe('AsyncLogo', () => {
  it('uses file-compatible relative asset paths for packaged Electron builds', () => {
    const { container } = render(<AsyncLogo wordmark />);

    const logos = [...container.querySelectorAll('img')];
    expect(logos.map((logo) => logo.getAttribute('src'))).toEqual([
      './async-logo-light.svg',
      './async-logo-dark.svg',
    ]);
  });
});
