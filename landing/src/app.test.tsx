import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LandingApp } from './app';

describe('LandingApp', () => {
  it('communicates the independent ASYNC product and its core actions', () => {
    const { container } = render(<LandingApp />);
    expect(
      screen.getByRole('heading', { name: /Your AI for learning and building/i })
    ).toBeVisible();
    expect(screen.getByRole('link', { name: /Download ASYNC/i })).toHaveAttribute('href');
    expect(screen.getByText(/No API keys/i)).toBeVisible();
    expect(container.querySelector('.hero-particles')).toBeInTheDocument();
  });
});
