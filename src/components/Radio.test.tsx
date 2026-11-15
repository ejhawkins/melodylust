import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Radio } from './Radio';

describe('Radio', () => {
  it('opens on Northern Soul with its uniform', () => {
    render(<Radio />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Northern Soul');
    expect(screen.getByText('Wigan ’73', { selector: 'p' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'THE UNIFORM' })).getAllByRole('listitem').map(item => item.textContent)).toEqual(
      ['01High-waisted baggies', '02Bowling shirt', '03Sleeveless vest', '04Sew-on club patches', '05Leather-soled shoes']);
    expect(screen.getByText('STATION 02 / 10')).toBeInTheDocument();
  });

  it('tunes from the station list, the dial and the arrows', () => {
    render(<Radio />);
    fireEvent.click(screen.getByRole('button', { name: /07\s*Grunge/ }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Grunge');
    fireEvent.click(screen.getByRole('button', { name: 'Next station' }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Techno');
    fireEvent.click(screen.getByRole('button', { name: 'Tune to Two Tone' }));
    expect(screen.getByRole('button', { name: 'Tune to Two Tone' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Previous station' }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Post-Punk');
  });

  it('goes on air and back off', () => {
    render(<Radio />);
    expect(screen.getByText('OFF AIR')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tune in' }));
    expect(screen.getByText('ON AIR')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(screen.getByText('OFF AIR')).toBeInTheDocument();
  });

  it('shows a newer station’s manifesto, records and curator’s note, and the general introduction elsewhere', () => {
    render(<Radio />);
    expect(screen.queryByRole('group', { name: 'About this station' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tune to Grime' }));
    const about = within(screen.getByRole('group', { name: 'About this station' }));
    expect(about.getByText(/The tracksuit was the press release/)).toBeInTheDocument();
    expect(about.getAllByRole('listitem').map(item => item.textContent)).toEqual(['Eskimo Wiley2002', 'I Luv U Dizzee Rascal2003', 'Pulse X Youngstar2002']);
    expect(about.getByText(/CURATOR’S NOTE/)).toBeInTheDocument();
  });
});
