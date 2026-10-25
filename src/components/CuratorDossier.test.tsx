import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DossierTab } from './CuratorDossier';

const auth = {
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe() {} } } })),
  signOut: vi.fn(),
};
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth } }));
const getStylingNotesWorkspace = vi.fn();
vi.mock('@/lib/styling-notes.functions', () => ({
  getStylingNotesWorkspace: () => getStylingNotesWorkspace(),
  listApprovedStylingNotes: vi.fn(), saveStylingNote: vi.fn(), deleteStylingNote: vi.fn(), reviewStylingNote: vi.fn(),
}));
const updateDisplayName = vi.fn();
vi.mock('@/lib/profile.functions', () => ({ updateDisplayName: (input: unknown) => updateDisplayName(input) }));

const { CuratorDossier } = await import('./CuratorDossier');
const { addWish } = await import('@/lib/wishlist');
const { encodeEdit } = await import('@/lib/dossier');
const { STYLE_PROFILE_KEY, emptyStyleProfile } = await import('@/lib/style-profile');

const piece = { kind: 'piece' as const, name: 'Callipygian ribbed cardigan', detail: 'Fall look: Over a slip skirt', link: 'https://www.farfetch.com/item-1.aspx', note: "Day 'N' Nite — Kid Cudi", from: 'Shop', image: 'https://cdn-images.farfetch-contents.com/1_400.jpg' };
const note = (status: string, title: string) => ({
  id: title, owner_id: 'u1', status, title, author_display_name: 'Maya R.', styling_idea: 'Camel coat over a hoodie.', tags: [],
  song_artist: 'Billie Eilish', song_track: 'CHIHIRO', song_reason: '', photo_paths: [], photo_alts: [], photo_urls: [],
  rejection_reason: null, reviewed_at: null, reviewed_by: null, created_at: '2026-10-18T08:00:00Z', updated_at: '2026-10-18T08:00:00Z',
});
const signedIn = { user: { id: 'u1', email: 'maya@example.com', created_at: '2026-10-15T16:03:30Z' } };

const renderDossier = (tab: DossierTab = 'edits', onTabChange = vi.fn()) => ({ onTabChange, ...render(<CuratorDossier tab={tab} onTabChange={onTabChange} />) });

beforeEach(() => {
  window.localStorage.clear();
  history.replaceState(null, '', '/profile');
  auth.getSession.mockResolvedValue({ data: { session: null } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Curator Dossier, signed out', () => {
  it('introduces a guest reader with live counts from this device', async () => {
    addWish(piece);
    window.localStorage.setItem(STYLE_PROFILE_KEY, JSON.stringify({ ...emptyStyleProfile(), music: ['R&B', 'Jazz'] }));
    renderDossier();
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/Curator dossier\s*\/\/\s*Guest/);
    expect(screen.getByText('Reading as a guest')).toBeInTheDocument();
    expect(screen.getByText('Reader')).toBeInTheDocument();
    const stat = (label: string) => screen.getByText(label).nextElementSibling?.textContent;
    expect(stat('Want List items')).toBe('1');
    expect(stat('Notes published')).toBe('—');
    expect(stat('Genres')).toBe('2');
  });

  it('shows each saved piece with its paired song', async () => {
    addWish(piece);
    renderDossier();
    const card = (await screen.findByRole('heading', { name: piece.name })).closest('li')!;
    expect(within(card).getByText("Paired with Day 'N' Nite — Kid Cudi")).toBeInTheDocument();
    expect(within(card).getByAltText(piece.name)).toHaveAttribute('src', piece.image);
  });

  it('switches tabs by click and arrow keys', async () => {
    const { onTabChange } = renderDossier();
    fireEvent.click(await screen.findByRole('tab', { name: '04. Style DNA' }));
    expect(onTabChange).toHaveBeenLastCalledWith('dna');
    fireEvent.keyDown(screen.getByRole('tab', { name: '01. Want list & edits' }), { key: 'ArrowLeft' });
    expect(onTabChange).toHaveBeenLastCalledWith('account');
  });

  it('opens the music library with the steps to bring one in from Google Takeout', async () => {
    renderDossier('library');
    expect(await screen.findByRole('heading', { name: 'Bring your library in.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Google Takeout' })).toHaveAttribute('href', 'https://takeout.google.com/');
    expect(screen.getByRole('button', { name: /Import Takeout file/ })).toBeInTheDocument();
  });

  it('shows the AI playlist area as a preview that sends nothing', async () => {
    renderDossier('playlist');
    const create = await screen.findByRole('button', { name: /Create playlist/ });
    expect(screen.getByText(/not connected yet/)).toBeInTheDocument();
    expect(create).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'A Sunday thrift run' }));
    expect(screen.getByRole('textbox', { name: 'Describe the playlist' })).toHaveValue('A Sunday thrift run');
    fireEvent.click(create);
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent(/nothing was sent anywhere/);
  });

  it('reads the Style DNA as chips and swatches, with a way to recalibrate', async () => {
    window.localStorage.setItem(STYLE_PROFILE_KEY, JSON.stringify({ ...emptyStyleProfile(), music: ['Jazz'], color: ['Burgundy'], fit: ['Oversized'] }));
    renderDossier('dna');
    expect(await screen.findByText('Jazz')).toBeInTheDocument();
    expect(screen.getByText('Burgundy')).toBeInTheDocument();
    expect(screen.getByText('Oversized')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recalibrate Style DNA' })).toBeInTheDocument();
  });

  it('asks a guest to sign in before showing Styling Notes', async () => {
    renderDossier('notes');
    expect(await screen.findByRole('heading', { name: 'Your notes live with your account.' })).toBeInTheDocument();
    expect(getStylingNotesWorkspace).not.toHaveBeenCalled();
  });

  it('offers a shared edit from the link and adds it to the Want List', async () => {
    history.replaceState(null, '', `/profile#edit=${encodeEdit([{ id: 'x', ...piece }])}`);
    renderDossier();
    expect(await screen.findByText('A shared edit · 1 save')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add to my Want List' }));
    expect(await screen.findByRole('heading', { name: piece.name })).toBeInTheDocument();
    expect(window.location.hash).toBe('');
  });

  it('clears the Want List only on a second tap', async () => {
    addWish(piece);
    renderDossier('account');
    const clear = await screen.findByRole('button', { name: 'Clear Want List' });
    fireEvent.click(clear);
    expect(JSON.parse(window.localStorage.getItem('ml-wishlist')!)).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Tap again to clear 1 save' }));
    expect(JSON.parse(window.localStorage.getItem('ml-wishlist')!)).toHaveLength(0);
    expect(screen.getByText('Want List cleared on this device.')).toBeInTheDocument();
  });
});

describe('Curator Dossier, signed in', () => {
  beforeEach(() => {
    auth.getSession.mockResolvedValue({ data: { session: signedIn } });
    getStylingNotesWorkspace.mockResolvedValue({ displayName: 'Maya R.', canModerate: false, own: [note('pending', 'Camel coat'), note('approved', 'Soft volume')], queue: [] });
  });

  it('names the curator, their role, membership and published count', async () => {
    renderDossier();
    expect(await screen.findByText('Maya R.')).toBeInTheDocument();
    expect(screen.getByText('Member since Oct 2026')).toBeInTheDocument();
    expect(screen.getByText('Contributor')).toBeInTheDocument();
    expect(screen.getByText('Notes published').nextElementSibling).toHaveTextContent('1');
  });

  it('tracks each note by its review status', async () => {
    renderDossier('notes');
    const inReview = (await screen.findByRole('heading', { name: 'Camel coat' })).closest('li')!;
    expect(within(inReview).getByText('In Review')).toBeInTheDocument();
    expect(within(screen.getByRole('heading', { name: 'Soft volume' }).closest('li')!).getByText('Published')).toBeInTheDocument();
  });

  it('renames the dossier from Account', async () => {
    updateDisplayName.mockResolvedValue({ displayName: 'Maya' });
    renderDossier('account');
    const input = await screen.findByLabelText('Display name');
    await act(async () => { await Promise.resolve(); });
    fireEvent.change(input, { target: { value: 'Maya' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Name saved.')).toBeInTheDocument();
    expect(updateDisplayName).toHaveBeenCalledWith({ data: { displayName: 'Maya' } });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Maya');
  });

  it('says so when Styling Notes cannot be reached', async () => {
    getStylingNotesWorkspace.mockRejectedValue(new Error('Styling Notes are unavailable.'));
    renderDossier('notes');
    expect(await screen.findByRole('heading', { name: "Your notes can't be loaded right now." })).toBeInTheDocument();
  });
});
