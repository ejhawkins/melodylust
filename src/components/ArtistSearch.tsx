import { useEffect, useId, useRef, useState } from 'react';
import { ArtistSuggestionList } from './ArtistSuggestionList';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { searchArtists, submitArtist } from '@/lib/artists.functions';
import { useArtistSuggestions } from '@/lib/use-artist-suggestions';
import { checkProfileUrl, type ArtistSuggestion, type SelectedArtist, type SubmissionResponse } from '@/lib/artist-search';
import { FREQBLOG_ATTRIBUTION } from '@/lib/artist-provider';

function submissionMessage(response: SubmissionResponse) {
  switch (response.status) {
    case 'created': return 'Thanks! Your artist submission is pending review.';
    case 'duplicate_artist': return `${response.name} is already in our artist directory. Try searching their name.`;
    case 'duplicate_pending': return 'This artist has already been submitted and is pending review.';
    case 'invalid': return response.message;
    case 'rate_limited': return 'Too many submissions — please try again in an hour.';
    case 'unavailable': return 'Artist submissions are unavailable right now. Please try again later.';
    case 'error': return 'We couldn’t save your submission. Please try again.';
  }
}

export function ArtistSearch({ onSelect, disabled = false }: { onSelect: (artist: SelectedArtist) => void; disabled?: boolean }) {
  const id = useId();
  const search = useServerFn(searchArtists);
  const submit = useServerFn(submitArtist);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SelectedArtist | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const state = useArtistSuggestions(selected || disabled ? '' : query, (value, signal) => search({ data: { query: value }, signal }));
  // A response for the previous input is never rendered during the debounce render.
  const current = 'query' in state && state.query === query.trim();
  const results = current && state.status === 'ready' ? state.results : [];
  const expanded = open && results.length > 0;
  const [form, setForm] = useState<{ name: string; profileUrl: string; note: string; website: string; startedAt: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => { setActive(-1); }, [query]);
  useEffect(() => {
    if (active >= 0) document.getElementById(`${id}-option-${active}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [active, id]);
  function choose(artist: ArtistSuggestion) {
    const pick = { id: artist.id, name: artist.name, source: artist.source };
    setSelected(pick); setQuery(artist.name); setOpen(false); setActive(-1); setForm(null); setMessage(''); onSelect(pick);
  }
  const empty = current && state.status === 'ready' && results.length === 0;
  const partial = current && state.status === 'ready' && (state.provider === 'unavailable' || (state.provider === 'not_configured' && !results.length));
  return <div className="artist-search">
    <label htmlFor={`${id}-input`}>Find a favorite artist</label>
    <p id={`${id}-hint`} className="artist-search-hint">Choose an artist to add to your sound. You can add up to ten.</p>
    <input ref={inputRef} id={`${id}-input`} role="combobox" aria-autocomplete="list" aria-expanded={expanded}
      aria-controls={`${id}-list`} aria-activedescendant={expanded && active >= 0 && active < results.length ? `${id}-option-${active}` : undefined}
      aria-describedby={`${id}-hint ${id}-status`} autoComplete="off" placeholder="Start typing an artist’s name…" maxLength={80} disabled={disabled}
      value={query} onChange={event => { setQuery(event.target.value); setSelected(null); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => { setOpen(false); setActive(-1); }}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); setActive(-1); }
        if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && results.length) {
          event.preventDefault(); setOpen(true);
          setActive(previous => event.key === 'ArrowDown' ? (previous + 1) % results.length : (previous <= 0 ? results.length - 1 : previous - 1));
        }
        if (event.key === 'Enter') { event.preventDefault(); if (expanded && active >= 0 && results[active]) choose(results[active]); }
      }} />
    <input type="hidden" name="artist_id" value={selected?.id ?? ''} />
    <input type="hidden" name="artist_name" value={selected?.name ?? ''} />
    <ArtistSuggestionList id={id} results={results} expanded={expanded} active={active} onChoose={choose} />
    <div id={`${id}-status`} role="status" aria-live="polite" className="artist-search-status">
      {disabled ? 'Ten artists selected. Remove one to add another.' : selected ? `${selected.name} selected.` : current && state.status === 'loading' ? 'Searching artists…' :
        current && state.status === 'offline' ? 'You’re offline. Reconnect to search for artists.' :
        current && state.status === 'error' ? "We couldn't reach artist search. Check your connection and try again." :
        current && state.status === 'rate_limited' ? 'Too many searches — wait a moment.' :
        empty ? `No artists found for '${query.trim()}'.` : ''}
      {partial && <p>Our music directory is unavailable right now, so results may be incomplete.</p>}
      {current && state.status === 'ready' && state.database === 'unavailable' && <p>Our approved artist directory is unavailable right now, so results may be incomplete.</p>}
    </div>
    {expanded && results.some(artist => artist.source === 'freqblog') && <p className="artist-credit">{FREQBLOG_ATTRIBUTION}</p>}
    {empty && !form && <Button type="button" variant="outline" onClick={() => { setForm({ name: query.trim(), profileUrl: '', note: '', website: '', startedAt: Date.now() }); setMessage(''); setDone(false); }}>Submit an artist</Button>}
    {form && <form className="artist-submit" aria-label="Submit an artist" onSubmit={async event => {
      event.preventDefault(); if (sending) return;
      const checked = checkProfileUrl(form.profileUrl);
      if (!checked.ok) { setMessage(checked.reason); return; }
      setSending(true); setMessage('');
      try { const response = await submit({ data: form }); setMessage(submissionMessage(response)); setDone(response.status === 'created' || response.status === 'duplicate_pending'); }
      catch { setMessage('We couldn’t save your submission. Check your connection and try again.'); }
      finally { setSending(false); }
    }}>
      <h3 className="font-editorial text-2xl">Add a name to the conversation.</h3>
      <p>Send an official artist or music profile. Our team reviews every submission before it joins the directory.</p>
      {!done && <>
        <label htmlFor={`${id}-name`}>Artist name</label><input autoFocus id={`${id}-name`} required maxLength={120} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <label htmlFor={`${id}-url`}>Official artist or music profile URL</label><input id={`${id}-url`} type="url" required maxLength={500} placeholder="https://…" value={form.profileUrl} onChange={e => setForm({ ...form, profileUrl: e.target.value })} />
        <label htmlFor={`${id}-note`}>Note <span>(optional)</span></label><textarea id={`${id}-note`} maxLength={500} rows={3} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
        <div className="artist-honeypot" aria-hidden="true"><label htmlFor={`${id}-website`}>Website</label><input id={`${id}-website`} tabIndex={-1} autoComplete="off" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></div>
      </>}
      <p role="status">{message}</p>
      <div className="artist-submit-actions">{!done && <Button type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send for review'}</Button>}<Button type="button" variant="ghost" onClick={() => { setForm(null); inputRef.current?.focus(); }}>{done ? 'Close' : 'Cancel'}</Button></div>
    </form>}
  </div>;
}
