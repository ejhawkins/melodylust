import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const listApprovedStylingNotes = vi.fn();
vi.mock('@/lib/styling-notes.functions', () => ({ listApprovedStylingNotes: () => listApprovedStylingNotes() }));
const { GuidedStory } = await import('./GuidedStory');

const approved = {
  id: '0b6f5c2e-7d0e-4c55-9a59-2f6a3c1d9e10', owner_id: 'u1', status: 'approved', author_display_name: 'Maya R.',
  title: 'Camel coat, loud headphones', styling_idea: 'A camel coat over a grey hoodie, straight denim and loafers.',
  tags: [], song_artist: 'Billie Eilish', song_track: 'CHIHIRO', song_reason: 'Soft layers.', photo_paths: ['u1/a.jpg'],
  photo_alts: ['Camel coat over a grey hoodie'], photo_urls: ['https://example.supabase.co/a.jpg?token=1'],
  rejection_reason: null, reviewed_at: null, reviewed_by: null, created_at: '2026-10-18T08:00:00Z', updated_at: '2026-10-18T08:00:00Z',
};

beforeAll(() => {
  // jsdom has no IntersectionObserver; the story only needs it to exist.
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  if (!window.matchMedia) vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => { cleanup(); listApprovedStylingNotes.mockReset(); });

describe('Opinions step', () => {
  it('features the newest approved Styling Note with its author, song and photo', async () => {
    listApprovedStylingNotes.mockResolvedValue({ notes: [approved] });
    render(<GuidedStory />);
    expect(await screen.findByText('Featured style note')).toBeInTheDocument();
    expect(screen.getByText('“A camel coat over a grey hoodie, straight denim and loafers.”')).toBeInTheDocument();
    expect(screen.getByText(/Maya R\., in Styling Notes/)).toBeInTheDocument();
    expect(screen.getByText('On repeat: CHIHIRO — Billie Eilish')).toBeInTheDocument();
    expect(screen.getByAltText('Camel coat over a grey hoodie')).toHaveAttribute('src', 'https://example.supabase.co/a.jpg?token=1');
    expect(screen.getByRole('link', { name: 'Read more Styling Notes' })).toHaveAttribute('href', '#styling-notes');
  });

  it('keeps the house stylist note when Styling Notes cannot load', async () => {
    listApprovedStylingNotes.mockRejectedValue(new Error('Styling Notes are unavailable.'));
    render(<GuidedStory />);
    await Promise.resolve();
    expect(screen.getByText('Style note')).toBeInTheDocument();
    expect(screen.getByText(/Melody Lust stylist, on the street in Paris/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Read more Styling Notes' })).toBeNull();
  });
});
