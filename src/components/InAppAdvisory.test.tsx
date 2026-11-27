import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InAppAdvisory } from './InAppAdvisory';
import { SpotifyFrame } from './SpotifyFrame';
import { isSilent, resetSoundChoiceCache, setSoundChoice, SOUND_CHOICE_KEY } from '@/lib/silent-mode';

vi.mock('sonner', () => ({ toast: vi.fn() }));

const INSTAGRAM = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 357.0.0.25.101';
const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const EMBED = 'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC?utm_source=generator&theme=0';

const asBrowser = (userAgent: string) => vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(userAgent);

beforeEach(() => { localStorage.clear(); resetSoundChoiceCache(); vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

/** The advisory waits for the page to settle before it opens. */
const renderAdvisory = () => { render(<InAppAdvisory />); act(() => { vi.advanceTimersByTime(1000); }); };

describe('isSilent', () => {
  it('is silent in an in-app browser until the reader asks for sound, and anywhere the reader chose silence', () => {
    expect(isSilent(null, null)).toBe(false);
    expect(isSilent(null, 'silent')).toBe(true); // "Stay in silence mode" at the room's door
    expect(isSilent(null, 'sound')).toBe(false);
    expect(isSilent('Instagram', null)).toBe(true);
    expect(isSilent('Instagram', 'silent')).toBe(true);
    expect(isSilent('Instagram', 'sound')).toBe(false);
  });
});

describe('InAppAdvisory', () => {
  it('never shows in a regular browser', () => {
    asBrowser(SAFARI);
    renderAdvisory();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('waits for the page to settle before asking', () => {
    asBrowser(INSTAGRAM);
    render(<InAppAdvisory />);
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('asks once inside an in-app browser and remembers silent', () => {
    asBrowser(INSTAGRAM);
    renderAdvisory();
    expect(screen.getByRole('dialog', { name: "You're in Instagram's browser" })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open in Safari' })).toHaveAttribute('href', expect.stringMatching(/^x-safari-http/));
    fireEvent.click(screen.getByRole('button', { name: 'Continue silent' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(localStorage.getItem(SOUND_CHOICE_KEY)).toBe('silent');
  });

  it('remembers sound', () => {
    asBrowser(INSTAGRAM);
    renderAdvisory();
    fireEvent.click(screen.getByRole('button', { name: 'Continue with sound' }));
    expect(localStorage.getItem(SOUND_CHOICE_KEY)).toBe('sound');
  });

  it('stays closed once answered', () => {
    asBrowser(INSTAGRAM);
    localStorage.setItem(SOUND_CHOICE_KEY, 'silent');
    renderAdvisory();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('SpotifyFrame', () => {
  it('is the Spotify embed in a regular browser', () => {
    asBrowser(SAFARI);
    render(<SpotifyFrame src={EMBED} title="Song on Spotify" />);
    expect(screen.getByTitle('Song on Spotify')).toHaveAttribute('src', EMBED);
  });

  it('is an Open in Spotify card in silent mode, and plays here on request', () => {
    asBrowser(INSTAGRAM);
    localStorage.setItem(SOUND_CHOICE_KEY, 'silent');
    render(<SpotifyFrame src={EMBED} title="Song on Spotify" />);
    expect(screen.queryByTitle('Song on Spotify')).toBeNull();
    expect(screen.getByRole('link', { name: /Open in Spotify/ })).toHaveAttribute('href', 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC');
    fireEvent.click(screen.getByRole('button', { name: 'Play here instead' }));
    expect(screen.getByTitle('Song on Spotify')).toHaveAttribute('src', EMBED);
  });

  it('follows a choice made elsewhere on the page', () => {
    asBrowser(INSTAGRAM);
    render(<SpotifyFrame src={EMBED} title="Song on Spotify" />);
    expect(screen.queryByTitle('Song on Spotify')).toBeNull();
    act(() => setSoundChoice('sound'));
    expect(screen.getByTitle('Song on Spotify')).toBeInTheDocument();
  });
});
