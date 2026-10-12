import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShopProduct } from '@/lib/farfetch';

const lookupProducts = vi.fn();
vi.mock('@/lib/products.functions', () => ({ lookupProducts: (...args: unknown[]) => lookupProducts(...args) }));
const { ShopProducts } = await import('./ShopProducts');
const { outfitSearchItems } = await import('./ArtistOutfitResult');

const product = (id: string, name: string): ShopProduct => ({ id, brand: 'Prada', name, price: 1200, currency: 'USD', image: `https://cdn-images.farfetch-contents.com/${id}_400.jpg`, link: `https://www.farfetch.com/shopping/search/items.aspx?q=${id}` });
const ok = (...products: ShopProduct[]) => ({ products, status: 'ok' });

describe('product cards for an outfit', () => {
  beforeEach(() => lookupProducts.mockReset());

  it('shows loading, then real products with provider images and labels', async () => {
    lookupProducts.mockResolvedValueOnce(ok(product('1', 'leather jacket'))).mockResolvedValueOnce(ok(product('2', 'pleated skirt')));
    render(<ShopProducts designer={null} items={['leather jacket', 'pleated skirt']} from="test" showStatus />);
    expect(screen.getByRole('status')).toHaveTextContent('Finding real pieces');
    expect(await screen.findByAltText('Prada leather jacket')).toHaveAttribute('src', 'https://cdn-images.farfetch-contents.com/1_400.jpg');
    expect(screen.getByAltText('Prada pleated skirt')).toBeInTheDocument();
    expect(lookupProducts).toHaveBeenCalledWith({ data: { item: 'leather jacket', limit: 1 } }); // no designer forced
  });

  it('says so when nothing matches, or when shopping is unavailable', async () => {
    lookupProducts.mockResolvedValue(ok());
    const { unmount } = render(<ShopProducts designer={null} items={['cape']} from="test" showStatus />);
    expect(await screen.findByText('No matching pieces on Farfetch right now.')).toBeInTheDocument();
    unmount();
    lookupProducts.mockResolvedValue({ products: [], status: 'not_configured' });
    render(<ShopProducts designer={null} items={['cape']} from="test" showStatus />);
    expect(await screen.findByText(/Shopping is unavailable right now/)).toBeInTheDocument();
  });

  it('hides a card whose photo fails to load, never showing a broken or substitute image', async () => {
    lookupProducts.mockResolvedValue(ok(product('1', 'leather jacket')));
    render(<ShopProducts designer={null} items={['leather jacket']} from="test" showStatus />);
    fireEvent.error(await screen.findByAltText('Prada leather jacket'));
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText(/Shopping is unavailable right now/)).toBeInTheDocument();
  });

  it('ignores an older outfit\'s products when the outfit changes before they arrive', async () => {
    let resolveOld!: (value: unknown) => void;
    lookupProducts.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; })).mockResolvedValueOnce(ok(product('2', 'pleated skirt')));
    const { rerender } = render(<ShopProducts designer={null} items={['leather jacket']} from="test" showStatus />);
    rerender(<ShopProducts designer={null} items={['pleated skirt']} from="test" showStatus />);
    expect(await screen.findByAltText('Prada pleated skirt')).toBeInTheDocument();
    await act(async () => { resolveOld(ok(product('1', 'leather jacket'))); });
    await waitFor(() => expect(screen.queryByAltText('Prada leather jacket')).toBeNull());
  });

  it('turns outfit pieces into garment searches', () => {
    expect(outfitSearchItems([{ name: 'Cropped leather jacket' }, { name: 'Wide-leg trousers' }, { name: 'Statement chain belt' }]))
      .toEqual(['cropped leather jacket', 'wide-leg trousers', 'chain belt']);
  });
});
