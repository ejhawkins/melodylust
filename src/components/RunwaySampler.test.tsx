import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const lookupTrackDetails = vi.fn();
vi.mock('@/lib/freqblog.functions', () => ({ lookupTrackDetails: (...args: unknown[]) => lookupTrackDetails(...args) }));
const { RunwaySampler } = await import('./RunwaySampler');
const { MAX_PICKS } = await import('@/lib/runway-sampler');

const editForm = (title: string) => screen.getByRole('form', { name: `Edit ${title}` });
const row = (title: string) => screen.getByRole('heading', { level: 3, name: title }).closest('li')!;

describe('Runway Sound Sampler page', () => {
  beforeEach(() => { window.localStorage.clear(); lookupTrackDetails.mockReset(); });

  it('shows the playlist player and the sourced running order', () => {
    render(<RunwaySampler />);
    expect(screen.getByTitle(/Spotify playlist/)).toHaveAttribute('src', expect.stringContaining('open.spotify.com/embed/playlist/1lcqw2N8tBqiXRbEQ6iAlg'));
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(12);
    expect(within(row('Work Bitch')).getByText('2 over band')).toBeInTheDocument();
    expect(within(row('Work Bitch')).getByRole('link', { name: 'SRC-006' })).toHaveAttribute('href', expect.stringContaining('anothermag.com'));
  });

  it('filters by category', () => {
    render(<RunwaySampler />);
    fireEvent.click(screen.getByRole('button', { name: /^C · Garage Rock/ }));
    expect(screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['The One I Love', 'Losing My Edge', 'Hello Operator']);
    expect(screen.getByRole('button', { name: /^C · Garage Rock/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('overrides a tempo by hand, keeps it on the device, and resets it', () => {
    const { unmount } = render(<RunwaySampler />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Sin Thetik (Prada SS21 Womenswear Version)' }));
    fireEvent.change(within(editForm('Sin Thetik (Prada SS21 Womenswear Version)')).getByLabelText('BPM'), { target: { value: '128' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const sinThetik = row('Sin Thetik (Prada SS21 Womenswear Version)');
    expect(within(sinThetik).getByText('Manual BPM')).toBeInTheDocument();
    expect(within(sinThetik).getByText('In band')).toBeInTheDocument();
    unmount();

    render(<RunwaySampler />);
    expect(within(row('Sin Thetik (Prada SS21 Womenswear Version)')).getByText('128 BPM')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Sin Thetik (Prada SS21 Womenswear Version)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset to sourced' }));
    expect(within(row('Sin Thetik (Prada SS21 Womenswear Version)')).getByText('64 BPM')).toBeInTheDocument();
  });

  it('rejects a tempo it can’t use', () => {
    render(<RunwaySampler />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Runway' }));
    fireEvent.change(within(editForm('Runway')).getByLabelText('BPM'), { target: { value: 'fast' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('between 30 and 250');
  });

  it('hides a track from the running order until shown again', () => {
    render(<RunwaySampler />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Mad World' }));
    fireEvent.click(screen.getByLabelText('Hide from my running order'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.queryByRole('heading', { level: 3, name: 'Mad World' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show hidden (1)' }));
    expect(within(row('Mad World')).getByText('Hidden')).toBeInTheDocument();
  });

  it('adds the reader’s own pick with a FreqBlog tempo and marks it unsourced', async () => {
    lookupTrackDetails.mockResolvedValue({ track: { title: 'Cotton', artist: 'Some Band', album: null, artworkUrl: null, bpm: 124, key: 'A minor', mood: null } });
    render(<RunwaySampler />);
    const form = screen.getByRole('heading', { name: 'Add your own pick' }).closest('section')!;
    fireEvent.change(within(form).getByLabelText('Track'), { target: { value: 'Cotton' } });
    fireEvent.change(within(form).getByLabelText('Artist'), { target: { value: 'Some Band' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Look up' }));
    expect(await within(form).findByText(/FreqBlog: 124 BPM · A minor/)).toBeInTheDocument();
    expect(lookupTrackDetails).toHaveBeenCalledWith({ data: { track: 'Cotton', artist: 'Some Band' } });
    expect(within(form).getByLabelText('BPM')).toHaveValue('124');
    fireEvent.click(within(form).getByRole('button', { name: 'Add to running order' }));
    const pick = row('Cotton');
    expect(within(pick).getByText('Your pick')).toBeInTheDocument();
    expect(within(pick).getByText('Unsourced')).toBeInTheDocument();
    expect(within(pick).getByText('In band')).toBeInTheDocument();
  });

  it('says so at the pick limit instead of losing the running order', () => {
    const added = Array.from({ length: MAX_PICKS }, (_, k) => ({ id: `manual-${k}`, title: `Pick ${k}`, artist: 'Someone', show: '', category: 'B', bpm: null, sourceUrl: null, note: '' }));
    window.localStorage.setItem('ml-runway-sampler', JSON.stringify({ edits: {}, added }));
    render(<RunwaySampler />);
    const form = screen.getByRole('heading', { name: 'Add your own pick' }).closest('section')!;
    fireEvent.change(within(form).getByLabelText('Track'), { target: { value: 'Cotton' } });
    fireEvent.change(within(form).getByLabelText('Artist'), { target: { value: 'Some Band' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Add to running order' }));
    expect(within(form).getByRole('alert')).toHaveTextContent(`You have ${MAX_PICKS} picks`);
    expect(JSON.parse(window.localStorage.getItem('ml-runway-sampler')!).added).toHaveLength(MAX_PICKS);
  }, 20_000); // renders sixty-two rows

  it('won’t add a pick with a non-https source', () => {
    render(<RunwaySampler />);
    const form = screen.getByRole('heading', { name: 'Add your own pick' }).closest('section')!;
    fireEvent.change(within(form).getByLabelText('Track'), { target: { value: 'Cotton' } });
    fireEvent.change(within(form).getByLabelText('Artist'), { target: { value: 'Some Band' } });
    fireEvent.change(within(form).getByLabelText('Source link'), { target: { value: 'http://example.com/show' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Add to running order' }));
    expect(within(form).getByRole('alert')).toHaveTextContent('https://');
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(12);
  });
});
