import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RunwayInspiration } from './RunwayInspiration';
import { emptyStyleProfile } from '@/lib/style-profile';

vi.mock('@/lib/designer-radio.functions', () => ({ getDesignerPortraits: vi.fn(async () => []) }));

const show = (profile = emptyStyleProfile()) => render(
  <QueryClientProvider client={new QueryClient()}>
    <RunwayInspiration profile={profile} notes={[]} songs={[]} onRetake={() => {}} onToggleTag={() => {}} />
  </QueryClientProvider>,
);

describe('Runways for your taste, before any tags', () => {
  it('asks a first-time reader to take the quiz, not retake it', () => {
    show();
    expect(screen.getByRole('button', { name: 'Take the style quiz' })).toBeTruthy();
  });
  it('offers a retake once the quiz has answers', () => {
    show({ ...emptyStyleProfile(), color: ['Burgundy'] });
    expect(screen.getByRole('button', { name: 'Retake the style quiz' })).toBeTruthy();
  });
});
