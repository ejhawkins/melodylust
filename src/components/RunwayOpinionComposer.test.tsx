import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const getSession = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: () => getSession() } } }));
const saveRunwayOpinion = vi.fn();
vi.mock('@/lib/styling-notes.functions', () => ({
  saveRunwayOpinion: (args: unknown) => saveRunwayOpinion(args),
  getStylingNotesWorkspace: vi.fn(), listApprovedStylingNotes: vi.fn(), saveStylingNote: vi.fn(), deleteStylingNote: vi.fn(), reviewStylingNote: vi.fn(),
}));
vi.mock('@/lib/google-sign-in', () => ({ availableGoogleFlow: async () => null, signInWithGoogle: vi.fn() }));
vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }));
const { RunwayOpinionComposer } = await import('./RunwayOpinionComposer');

const signedIn = (yes: boolean) => getSession.mockResolvedValue({ data: { session: yes ? { user: { id: 'u1' } } : null } });
const opinion = 'The grey tailoring against that score is the whole point.';
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Runway Style Opinion? composer', () => {
  it('shows the hero film as context and starts the title from it', async () => {
    signedIn(true);
    render(<RunwayOpinionComposer topic="thom-browne-fw17" />);
    expect(screen.getByText('Thom Browne · Fall/Winter 2017')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Thom Browne Fall/Winter 2017');
    expect(screen.getByLabelText('Opinion')).toHaveValue('');
    expect(screen.getByLabelText(/Notes/)).not.toBeRequired();
    expect(screen.queryByLabelText(/topic|show/i)).toBeNull();
  });

  it('asks for a title and an opinion before sending anything', async () => {
    signedIn(true);
    render(<RunwayOpinionComposer topic="thom-browne-fw17" />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Submit for review' })).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit for review' }));
    expect(await screen.findByText('Give your opinion a title.')).toBeInTheDocument();
    expect(screen.getByText('Say a little more: at least 10 characters.')).toBeInTheDocument();
    expect(screen.getByLabelText('Opinion')).toHaveAttribute('aria-invalid', 'true');
    expect(saveRunwayOpinion).not.toHaveBeenCalled();
  });

  it('sends the opinion for review, tied to the show automatically', async () => {
    signedIn(true);
    saveRunwayOpinion.mockResolvedValue({ id: 'n1' });
    const onDone = vi.fn();
    render(<RunwayOpinionComposer topic="thom-browne-fw17" onDone={onDone} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Submit for review' })).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Opinion'), { target: { value: opinion } });
    fireEvent.change(screen.getByLabelText(/Notes/), { target: { value: 'Saw it twice.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit for review' }));
    await waitFor(() => expect(saveRunwayOpinion).toHaveBeenCalledWith({ data: { topic: 'thom-browne-fw17', title: 'Thom Browne Fall/Winter 2017', opinion, notes: 'Saw it twice.' } }));
    expect(await screen.findByText(/in review/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onDone).toHaveBeenCalled();
  });

  it('sends a signed-out visitor to sign in instead of saving', async () => {
    signedIn(false);
    render(<RunwayOpinionComposer topic="thom-browne-fw17" />);
    const button = await screen.findByRole('button', { name: 'Sign in to submit' });
    fireEvent.change(screen.getByLabelText('Opinion'), { target: { value: opinion } });
    fireEvent.click(button);
    expect(await screen.findByRole('dialog', { name: 'Sign in to contribute' })).toBeInTheDocument();
    expect(saveRunwayOpinion).not.toHaveBeenCalled();
  });

  it('shows the server’s refusal and keeps the opinion', async () => {
    signedIn(true);
    saveRunwayOpinion.mockRejectedValue(new Error('Your Runway Style Opinion could not be submitted.'));
    render(<RunwayOpinionComposer topic="thom-browne-fw17" />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Submit for review' })).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Opinion'), { target: { value: opinion } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit for review' }));
    expect(await screen.findByText('Your Runway Style Opinion could not be submitted.')).toBeInTheDocument();
    expect(screen.getByLabelText('Opinion')).toHaveValue(opinion);
  });
});
