import { useId } from 'react';
import { Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ROOM_THEMES } from '@/lib/themes/theme-spec';
import { THEME_IDS, themeOf, type StyleSelection } from '@/lib/themes/style-choice';
import { themeStyle } from '@/lib/themes/theme-css';

const DEFAULT_LABEL = 'Melody Lust';

/** The style choices as a native radio group: arrow keys move between styles, Space/Enter picks, and the
 *  checked one is the current style. Used in the top bar's popover and on its own on /listen. */
export function StyleOptions({ selection, onChoose, includeDefault = true }: { selection: StyleSelection | null; onChoose: (next: StyleSelection | null) => void; includeDefault?: boolean }) {
  const name = useId();
  return (
    <fieldset className="ls-style-panel">
      <legend>Room style</legend>
      {includeDefault && (
        <label className="ls-style-option">
          <input type="radio" name={name} checked={!selection} onChange={() => onChoose(null)} />
          <span className="ls-style-swatch" style={{ background: '#0B040B' }} aria-hidden />
          <span>{DEFAULT_LABEL}<small>The room as it is</small></span>
        </label>
      )}
      {THEME_IDS.map(id => {
        const theme = ROOM_THEMES[id];
        return (
          <label key={id} className="ls-style-option">
            <input type="radio" name={name} value={id} checked={selection?.primary === id} onChange={() => onChoose({ primary: id })} />
            <span className="ls-style-swatch" style={{ background: theme.palette.highlight, color: theme.palette.accent }} aria-hidden />
            <span>{theme.label}<small>{theme.kind === 'season' ? 'Runway season' : 'Music genre'} · {theme.content.genres.join(', ')}</small></span>
          </label>
        );
      })}
    </fieldset>
  );
}

/** Top-bar control: shows the current style and opens the choices. */
export function StylePicker({ selection, onChoose }: { selection: StyleSelection | null; onChoose: (next: StyleSelection | null) => void }) {
  const label = selection ? ROOM_THEMES[selection.primary].label : DEFAULT_LABEL;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="listenOutline" size="bar" className="ls-style" aria-label={`Room style: ${label}. Change style`}>
          <Palette aria-hidden /><span className="ls-style-current">{label}</span>
        </Button>
      </PopoverTrigger>
      {/* The popover renders outside .ls, so it carries the style's variables itself. */}
      <PopoverContent align="end" className="w-auto border-0 bg-transparent p-0 shadow-none" style={themeStyle(themeOf(selection))}>
        <StyleOptions selection={selection} onChoose={onChoose} />
      </PopoverContent>
    </Popover>
  );
}
