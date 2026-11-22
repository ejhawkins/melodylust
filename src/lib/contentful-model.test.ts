import { describe, expect, it } from 'vitest';
import { CONTENT_MODEL, compareModel, modelMarkdown, readLiveModel } from './contentful-model';

/** A Contentful content type as the API returns it. */
const type = (id: string, fields: Record<string, unknown>[]) => ({ sys: { id, type: 'ContentType' }, name: id, fields });
/** The whole expected model, as a space that has every field would return it. */
const complete = () => ({
  items: CONTENT_MODEL.map(t => type(t.id, t.fields.map(f => ({
    id: f.id, type: f.type, required: !!f.required,
    ...(f.type === 'Link' ? { linkType: f.link } : {}),
    ...(f.type === 'Array' ? { items: f.link ? { type: 'Link', linkType: f.link } : { type: 'Symbol' } } : {}),
  })))),
});

describe('content model check', () => {
  it('reads content types and their fields, with array links', () => {
    const live = readLiveModel({ items: [type('song', [{ id: 'pieces', type: 'Array', items: { type: 'Link', linkType: 'Entry' } }, { id: 'x', type: 'Symbol', omitted: true }])] });
    expect(live).toEqual([{ id: 'song', name: 'song', fields: [
      { id: 'pieces', type: 'Array', required: false, link: 'Entry', disabled: false, omitted: false },
      { id: 'x', type: 'Symbol', required: false, link: '', disabled: false, omitted: true },
    ] }]);
    expect(readLiveModel('nope')).toEqual([]);
  });

  it('finds nothing wrong with a space that has the whole model', () => {
    expect(compareModel(readLiveModel(complete()))).toEqual([]);
  });

  it('names a missing type, a missing required field, a wrong type and a hidden field', () => {
    const payload = complete();
    payload.items = payload.items.filter(t => t.sys.id !== 'goodRead');
    const story = payload.items.find(t => t.sys.id === 'story')!;
    story.fields = story.fields.filter(f => f['id'] !== 'title').map(f => (f['id'] === 'date' ? { ...f, type: 'Symbol' } : f['id'] === 'intro' ? { ...f, omitted: true } : f));
    const drift = compareModel(readLiveModel(payload));
    expect(drift).toEqual(expect.arrayContaining([
      expect.objectContaining({ level: 'missing', type: 'goodRead' }),
      expect.objectContaining({ level: 'missing', type: 'story', field: 'title' }),
      expect.objectContaining({ level: 'mismatch', type: 'story', field: 'date' }),
      expect.objectContaining({ level: 'mismatch', type: 'story', field: 'intro' }),
    ]));
  });

  it('accepts a long-text story body, and reports optional and extra fields only as news', () => {
    const payload = complete();
    const story = payload.items.find(t => t.sys.id === 'story')!;
    story.fields = [...story.fields.filter(f => f['id'] !== 'image').map(f => (f['id'] === 'body' ? { ...f, type: 'Text' } : f)), { id: 'author', type: 'Symbol' }];
    payload.items.push(type('event', []));
    const drift = compareModel(readLiveModel(payload));
    expect(drift.map(d => d.level).sort()).toEqual(['extra', 'extra', 'optional']);
    expect(modelMarkdown(readLiveModel(payload), drift, '2026-11-22')).toContain('Every type and field the site reads is in the space.');
  });

  it('keeps every entry link pointing at a type in the model', () => {
    const ids = new Set(CONTENT_MODEL.map(t => t.id));
    for (const t of CONTENT_MODEL) for (const f of t.fields) for (const to of f.to ?? []) expect(ids.has(to), `${t.id}.${f.id} → ${to}`).toBe(true);
  });
});
