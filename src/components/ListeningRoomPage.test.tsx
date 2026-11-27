import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { resetSoundChoiceCache, SOUND_CHOICE_KEY } from '@/lib/silent-mode';

const navigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));
// Ready at once, so the two doors show.
vi.mock('@/lib/themes/readiness', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/themes/readiness')>()),
  trackReadiness: (_steps: unknown, onProgress: (p: number) => void) => { onProgress(100); return () => {}; },
}));

const { ListeningRoomPage } = await import('./ListeningRoomPage');

describe('the room’s door: listening or silence', () => {
  beforeEach(() => { localStorage.clear(); resetSoundChoiceCache(); navigate.mockReset(); });
  afterEach(() => resetSoundChoiceCache());

  it('enters the room with sound', () => {
    render(<ListeningRoomPage themeId="autumn-tartan" />);
    fireEvent.click(screen.getByRole('button', { name: 'Enter the listening room' }));
    expect(localStorage.getItem(SOUND_CHOICE_KEY)).toBe('sound');
    expect(navigate).toHaveBeenCalledWith({ to: '/' });
    expect(screen.queryByText(/not connected yet/)).toBeNull(); // no dead end
  });

  it('enters the room in silence, rather than leaving it', () => {
    render(<ListeningRoomPage themeId="autumn-tartan" />);
    fireEvent.click(screen.getByRole('button', { name: 'Stay in silence mode' }));
    expect(localStorage.getItem(SOUND_CHOICE_KEY)).toBe('silent');
    expect(navigate).toHaveBeenCalledWith({ to: '/' });
  });
});
