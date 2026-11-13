import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ExternalLink, RotateCcw } from 'lucide-react';
import { ArtistSearch } from './ArtistSearch';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { editorialReferences, emptyStyleProfile, profileFields, profileSelectionCount, type ProfileField, type StyleProfile } from '@/lib/style-profile';

const steps: { title: string; fields: ProfileField[] }[] = [
  { title: 'Your silhouette', fields: ['fit', 'item', 'aesthetic'] },
  { title: 'Color & texture', fields: ['color', 'material', 'pattern', 'details'] },
  { title: 'Where you wear it', fields: ['brand', 'occasion', 'season'] },
  { title: 'Your sound & reading list', fields: ['music'] },
];

export function StyleProfileQuiz({ open, onOpenChange, profile, onSave, onClear, onRead, tone }: {
  /** "room" sets the quiz in the Listening Room's tokens and fonts; the layout stays the journal's editorial one. */
  tone?: "room";
  open: boolean; onOpenChange: (open: boolean) => void; profile: StyleProfile;
  onSave: (profile: StyleProfile) => boolean; onClear: () => boolean; onRead: (id: number) => void;
}) {
  const [draft, setDraft] = useState(profile);
  const [step, setStep] = useState(0);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => { if (open) { setDraft(profile); setStep(0); setStorageError(false); } }, [open, profile]);
  const current = steps[step];
  const count = profileSelectionCount(draft);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className={`max-h-[88dvh] max-w-2xl overflow-y-auto p-6 sm:p-8${tone === "room" ? " ls-quiz" : ""}`}>
    <span className="text-xs uppercase text-muted-foreground">Melody Lust / Style profile · {Math.min(step + 1, 4)} of 4</span>
    <DialogTitle className="font-editorial text-3xl font-normal">{current?.title ?? 'Your taste, on record.'}</DialogTitle>
    <DialogDescription>{current ? 'Your favorites.' : `${count} preferences · Saved on this device.`}</DialogDescription>
    <div className="space-y-6 py-3">
      {current?.fields.map(key => {
        const field = profileFields.find(field => field.key === key);
        if (!field) return null;
        return <fieldset key={key}><legend className="mb-3 text-xs uppercase text-muted-foreground">{field.label}</legend><div className="flex flex-wrap gap-2">{field.options.map(option => <Button type="button" variant="profileChoice" aria-pressed={draft[key].includes(option)} key={option} onClick={() => setDraft(prev => ({ ...prev, [key]: prev[key].includes(option) ? prev[key].filter(value => value !== option) : [...prev[key], option] }))}>
          {key === 'color' && <span className="profile-swatch" data-color={option} aria-hidden="true" />}{option}{draft[key].includes(option) && <Check />}
        </Button>)}</div></fieldset>;
      })}
      {step === 3 && <>
        <ArtistSearch disabled={draft.artistPicks.length >= 10} onSelect={artist => setDraft(prev => ({ ...prev, artistPicks: prev.artistPicks.some(pick => pick.id === artist.id) || prev.artistPicks.length >= 10 ? prev.artistPicks : [...prev.artistPicks, artist] }))} />
        {draft.artistPicks.length > 0 && <ul className="artist-picks" aria-label="Selected artists">{draft.artistPicks.map(artist => <li key={artist.id}><span>{artist.name}{artist.source === 'mock' && <small> · Mock data</small>}</span><Button type="button" variant="ghost" aria-label={`Remove ${artist.name}`} onClick={() => setDraft(prev => ({ ...prev, artistPicks: prev.artistPicks.filter(pick => pick.id !== artist.id) }))}>Remove</Button></li>)}</ul>}
        <div><label htmlFor="profile-artists" className="mb-3 block text-xs uppercase text-muted-foreground">Other favorite artists or songs</label><input className="w-full border border-input bg-background p-3 text-base" id="profile-artists" placeholder="Kali Uchis, Charli XCX…" maxLength={200} value={draft.artists} onChange={event => setDraft(prev => ({ ...prev, artists: event.target.value }))} /></div>
        <fieldset><legend className="mb-3 text-xs uppercase text-muted-foreground">Fashion reading list</legend><div className="divide-y divide-border">{editorialReferences.map(article => <div className="flex items-start gap-3 py-3" key={article.id}><label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3"><input type="checkbox" className="mt-1 accent-primary" checked={draft.articles.includes(article.id)} onChange={() => setDraft(prev => ({ ...prev, articles: prev.articles.includes(article.id) ? prev.articles.filter(id => id !== article.id) : [...prev.articles, article.id] }))} /><span><small className="block text-muted-foreground">{article.publisher}</small><span className="text-sm">{article.title}</span></span></label>{'url' in article ? <Button asChild variant="ghost" size="icon"><a href={article.url} target="_blank" rel="noopener noreferrer" aria-label={`Read ${article.title}`} title="Read article"><ExternalLink /></a></Button> : <Button type="button" variant="ghost" size="icon" aria-label={`Read ${article.title}`} title="Read article" onClick={() => onRead(article.storyId)}><ArrowRight /></Button>}</div>)}</div></fieldset>
      </>}
      {!current && <div className="divide-y divide-border">{profileFields.filter(field => draft[field.key].length).map(field => <div className="py-3" key={field.key}><small className="text-muted-foreground">{field.label}</small><p className="text-sm">{draft[field.key].join(' · ')}</p></div>)}{draft.artistPicks.length > 0 && <div className="py-3"><small className="text-muted-foreground">Selected artists</small>{draft.artistPicks.map(artist => <p key={artist.id}>{artist.name}{artist.source === 'mock' ? ' · Mock data' : ''}</p>)}</div>}{draft.artists && <div className="py-3"><small className="text-muted-foreground">Artists / songs</small><p>{draft.artists}</p></div>}{draft.articles.length > 0 && <div className="py-3"><small className="text-muted-foreground">Reading list</small>{editorialReferences.filter(article => draft.articles.includes(article.id)).map(article => <p key={article.id} className="text-sm">{article.publisher} — {article.title}</p>)}</div>}</div>}
    </div>
    {storageError && <p role="alert" className="text-sm text-destructive">Your device couldn’t save the profile. Please allow browser storage and try again.</p>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      <Button variant="ghost" size="icon" title="Clear profile" aria-label="Clear style profile" onClick={() => { if (onClear()) { setDraft(emptyStyleProfile()); setStep(0); setStorageError(false); } else setStorageError(true); }}><RotateCcw /></Button>
      <div className="flex gap-2">{step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)}><ArrowLeft /> Back</Button>}{current ? <Button onClick={() => setStep(step + 1)}>{step === 3 ? 'Review profile' : 'Next'} <ArrowRight /></Button> : <Button disabled={!count} onClick={() => { if (onSave(draft)) { onOpenChange(false); document.getElementById('search')?.scrollIntoView({ behavior: 'smooth' }); } else setStorageError(true); }}>Save profile <Check /></Button>}</div>
    </div>
  </DialogContent></Dialog>;
}
