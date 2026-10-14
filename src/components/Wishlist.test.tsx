import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addWish } from '@/lib/wishlist';

vi.mock('@/lib/melodylust.functions', () => ({ searchTrackedEditorialEvidence: vi.fn() }));
const { Wishlist } = await import('./Wishlist');

const piece = (n: number) => ({ kind: 'piece' as const, name: `Brand piece ${n}`, detail: `$${n}00`, link: `https://www.farfetch.com/item-${n}.aspx`, note: '', from: 'Shop', image: `https://cdn-images.farfetch-contents.com/${n}_400.jpg` });
const looks = () => screen.getAllByRole('article').filter(article => article.classList.contains('want-look'));

describe('Want List preview edit', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it('shows the editorial placeholders until the reader saves Farfetch pieces', () => {
    render(<Wishlist />);
    expect(screen.getByRole('heading', { name: 'II. Output / Preview edit' })).toBeInTheDocument();
    expect(looks().map(look => within(look).getByText(/Product placeholder|Via Farfetch/).textContent)).toEqual(['Product placeholder', 'Product placeholder']);
  });

  it('fills the looks with saved pieces and their photos, latest first, keeping a placeholder for an empty slot', () => {
    render(<Wishlist />);
    act(() => { addWish(piece(1)); addWish(piece(2)); });
    expect(screen.getByRole('heading', { name: 'II. Output / Your edit' })).toBeInTheDocument();
    const [first, second] = looks();
    expect(within(first!).getByText('Via Farfetch')).toBeInTheDocument();
    expect(within(first!).getByRole('heading', { name: 'Brand piece 2' })).toBeInTheDocument();
    expect(within(first!).getByAltText('Brand piece 2')).toHaveAttribute('src', 'https://cdn-images.farfetch-contents.com/2_400.jpg');
    expect(within(first!).getByAltText('Brand piece 1')).toBeInTheDocument();
    expect(within(second!).getByText('Product placeholder')).toBeInTheDocument();
    act(() => { addWish(piece(3)); addWish(piece(4)); });
    expect(looks().map(look => within(look).getByText(/Product placeholder|Via Farfetch/).textContent)).toEqual(['Via Farfetch', 'Via Farfetch']);
  });

  it('leaves pieces without a photo out of the preview', () => {
    render(<Wishlist />);
    act(() => { addWish({ kind: 'piece', name: 'Leather jacket idea', detail: '', link: '', note: '', from: 'AI styling' }); });
    expect(screen.getByRole('heading', { name: 'II. Output / Preview edit' })).toBeInTheDocument();
  });
});
