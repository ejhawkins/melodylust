import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StyleOptions, StylePicker } from './StylePicker';

describe('StyleOptions', () => {
  it('lists the default look and every theme, with the current one checked', () => {
    render(<StyleOptions selection={{ primary: 'hiphop-runway' }} onChoose={() => {}} />);
    const group = screen.getByRole('group', { name: 'Room style' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Hip Hop x Runway/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Autumn Tartan/ })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /Melody Lust/ })).not.toBeChecked();
  });

  it('uses native radios (arrow keys and Space work), so choosing one reports it', () => {
    const onChoose = vi.fn();
    render(<StyleOptions selection={null} onChoose={onChoose} />);
    expect(screen.getByRole('radio', { name: /Melody Lust/ })).toBeChecked();
    const tartan = screen.getByRole('radio', { name: /Autumn Tartan/ });
    expect(tartan.tagName).toBe('INPUT');
    fireEvent.click(tartan); // what Space or an arrow key does to a native radio
    expect(onChoose).toHaveBeenLastCalledWith({ primary: 'autumn-tartan' });
    fireEvent.click(screen.getByRole('radio', { name: /Melody Lust/ }));
    expect(onChoose).toHaveBeenCalledTimes(1); // already the default: no change event
  });
});

describe('StylePicker', () => {
  it('names the current style on its button and opens the choices', async () => {
    render(<StylePicker selection={{ primary: 'autumn-tartan' }} onChoose={() => {}} />);
    const button = screen.getByRole('button', { name: 'Room style: Autumn Tartan. Change style' });
    fireEvent.click(button);
    expect(await screen.findByRole('radio', { name: /Autumn Tartan/ })).toBeChecked();
  });
});
