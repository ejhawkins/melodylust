import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LikeButton } from './LikeButton';
import { readLikes } from '@/lib/likes';

afterEach(() => { cleanup(); window.localStorage.clear(); });

describe('LikeButton', () => {
  // Regression: the heart was written `onLike?.(toggleLike(…))`, which skips toggleLike whenever no onLike is passed,
  // so every heart but the product card's did nothing.
  it('saves and removes a favourite with no onLike', () => {
    render(<LikeButton look="quick" kind="playlist" id="mix" name="The Autumn Mix" />);
    act(() => { fireEvent.click(screen.getByRole('button', { name: /^Like The Autumn Mix/ })); });
    expect(readLikes()).toMatchObject([{ kind: 'playlist', key: 'mix', title: 'The Autumn Mix' }]);
    const heart = screen.getByRole('button', { name: /^Remove The Autumn Mix/ });
    expect(heart.getAttribute('aria-pressed')).toBe('true');
    act(() => { fireEvent.click(heart); });
    expect(readLikes()).toEqual([]);
  });

  it('tells the host whether the item is liked now, after saving it', () => {
    const onLike = vi.fn();
    render(<LikeButton kind="fashion" id="bag-1" name="the bag" onLike={onLike} />);
    act(() => { fireEvent.click(screen.getByRole('button', { name: /^Like the bag/ })); });
    expect(onLike).toHaveBeenLastCalledWith(true);
    expect(readLikes()).toHaveLength(1);
    act(() => { fireEvent.click(screen.getByRole('button', { name: /^Remove the bag/ })); });
    expect(onLike).toHaveBeenLastCalledWith(false);
  });
});
