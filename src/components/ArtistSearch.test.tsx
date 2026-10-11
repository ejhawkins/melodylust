import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ArtistSearch } from './ArtistSearch';
import { MOCK_ARTISTS } from '@/lib/artist-provider';
const mocks = vi.hoisted(() => ({ search: vi.fn(), submit: vi.fn() }));
vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock('@/lib/artists.functions', () => ({ searchArtists: mocks.search, submitArtist: mocks.submit }));
beforeEach(() => { mocks.search.mockReset(); mocks.submit.mockReset(); });
afterEach(cleanup);
const response = { status: 'ok', results: MOCK_ARTISTS.slice(0, 2), provider: 'mock', database: 'ok' };
describe('artist combobox', () => {
  it('supports arrows, Escape, Enter and stable hidden values; typing clears identity', async () => {
    mocks.search.mockResolvedValue(response);
    const onSelect = vi.fn();
    const { container } = render(<ArtistSearch onSelect={onSelect} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 've' } });
    await screen.findAllByRole('option');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[0]?.id);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).not.toHaveAttribute('aria-activedescendant');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith({ id: 'mock:2', name: 'Velvet Static', source: 'mock' });
    expect(container.querySelector('input[name=artist_id]')).toHaveValue('mock:2');
    fireEvent.change(input, { target: { value: 'other' } });
    expect(container.querySelector('input[name=artist_id]')).toHaveValue('');
  });
  it('submits an unmatched artist and shows pending confirmation', async () => {
    mocks.search.mockResolvedValue({ ...response, results: [] });
    mocks.submit.mockResolvedValue({ status: 'created' });
    render(<ArtistSearch onSelect={vi.fn()} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zzqx' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Submit an artist' }));
    expect(screen.getByLabelText('Artist name')).toHaveValue('zzqx');
    fireEvent.change(screen.getByLabelText('Official artist or music profile URL'), { target: { value: 'https://example.com/artist' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Submit an artist' }));
    await screen.findByText('Thanks! Your artist submission is pending review.');
    expect(mocks.submit.mock.calls[0]?.[0].data).toMatchObject({ name: 'zzqx', profileUrl: 'https://example.com/artist', website: '' });
  });
  it('distinguishes connection errors from no matches', async () => {
    mocks.search.mockRejectedValue(new Error('offline'));
    render(<ArtistSearch onSelect={vi.fn()} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 've' } });
    await screen.findByText("We couldn't reach artist search. Check your connection and try again.");
    expect(screen.queryByText(/No artists found/)).toBeNull();
  });
  it('keeps database matches available during provider failure', async () => {
    mocks.search.mockResolvedValue({ ...response, results: [{ ...MOCK_ARTISTS[0], source: 'melodylust' }], provider: 'unavailable' });
    render(<ArtistSearch onSelect={vi.fn()} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 've' } });
    await screen.findByRole('option');
    expect(screen.getByText(/music directory is unavailable/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option'));
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('Velvet Static'));
  });
});
