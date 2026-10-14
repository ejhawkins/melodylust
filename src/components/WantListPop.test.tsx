import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addWish } from '@/lib/wishlist';
import { WantListPop } from './WantListPop';

describe('live Want List card', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it('appears when a piece or song is saved, with live counts and the latest saves', async () => {
    render(<WantListPop />);
    expect(screen.queryByRole('complementary', { name: 'The Want List' })).toBeNull();
    act(() => { addWish({ kind: 'piece', name: 'Callipygian ribbed cardigan', detail: '$310', link: '', note: '', from: 'Shop' }); });
    expect(await screen.findByText('Added to The Want List')).toBeInTheDocument();
    expect(screen.getByText('$310')).toBeInTheDocument();
    act(() => { addWish({ kind: 'song', name: 'DANCE... — Slayyyter', detail: 'Slayyyter', link: '', note: '', from: 'On repeat' }); });
    expect(await screen.findByText('Added to your playlist')).toBeInTheDocument();
    const card = screen.getByRole('complementary', { name: 'The Want List' });
    expect(card).toHaveTextContent('Pieces 01');
    expect(card).toHaveTextContent('Saved tracks 01');
    expect(screen.getByRole('list', { name: 'Latest saves' }).children[0]).toHaveTextContent('DANCE... — Slayyyter');
  });

  it('says so when the save is already on the list, and closes on request', async () => {
    const piece = { kind: 'piece' as const, name: 'Leather midi skirt', detail: '', link: '', note: '', from: 'Shop' };
    addWish(piece);
    render(<WantListPop />);
    act(() => { addWish(piece); });
    expect(await screen.findByText('Already on your list')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Leather midi skirt is already on your Want List.');
    fireEvent.click(screen.getByRole('button', { name: 'Close the Want List card' }));
    expect(screen.queryByRole('complementary', { name: 'The Want List' })).toBeNull();
  });
});
