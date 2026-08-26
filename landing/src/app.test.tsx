import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LandingApp } from './app';

describe('LandingApp', () => {
  it('communicates the independent ASYNC product and its core actions', () => {
    const { container } = render(<LandingApp />);
    expect(
      screen.getByRole('heading', { name: /Write better, learn faster, build smarter/i })
    ).toBeVisible();
    expect(screen.getByRole('link', { name: /Download for free/i })).toHaveAttribute('href');
    expect(screen.getByRole('link', { name: /View on GitHub/i })).toHaveAttribute('href');
    expect(
      screen.queryByText(/Open source · Local-first · Built for learning/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Stay in your flow/i })).not.toBeInTheDocument();
    expect(container.querySelector('.particles-container')).toBeInTheDocument();
  });
});
