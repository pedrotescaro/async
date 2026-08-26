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
    expect(screen.getByRole('heading', { name: /Stay in your flow/i })).toBeVisible();
    expect(screen.queryByText(/More than autocomplete/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Built for developers/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Built in public/i)).not.toBeInTheDocument();
    expect(container.querySelector('.hero-particles')).toBeInTheDocument();
  });
});
