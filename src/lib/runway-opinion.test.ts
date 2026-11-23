import { describe, expect, it } from 'vitest';
import {
  canModerate, defaultOpinionTitle, HERO_FILM_TOPIC, opinionErrors, reviewChange, runwayOpinionInput, runwayOpinionRow, topicLabel,
} from './runway-opinion';

const valid = { topic: HERO_FILM_TOPIC, title: 'Thom Browne Fall/Winter 2017', opinion: 'The grey tailoring against that score is the whole point.' };

describe('the hero film context', () => {
  it('is Thom Browne Fall/Winter 2017, shown as context and used as the starting title', () => {
    expect(HERO_FILM_TOPIC).toBe('thom-browne-fw17');
    expect(topicLabel(HERO_FILM_TOPIC)).toBe('Thom Browne · Fall/Winter 2017');
    expect(defaultOpinionTitle(HERO_FILM_TOPIC)).toBe('Thom Browne Fall/Winter 2017');
  });
});

describe('validation', () => {
  it('accepts a title and an opinion; notes are optional', () => {
    expect(runwayOpinionInput.parse(valid)).toEqual({ ...valid, notes: '' });
    expect(opinionErrors(valid)).toEqual({});
  });
  it('requires a title and an opinion of some substance', () => {
    expect(opinionErrors({ ...valid, title: '  ' }).title).toBe('Give your opinion a title.');
    expect(opinionErrors({ ...valid, opinion: 'meh' }).opinion).toBe('Say a little more: at least 10 characters.');
  });
  it('caps each field', () => {
    expect(opinionErrors({ ...valid, title: 'x'.repeat(121) }).title).toBeTruthy();
    expect(opinionErrors({ ...valid, opinion: 'x'.repeat(2001) }).opinion).toBeTruthy();
    expect(opinionErrors({ ...valid, notes: 'x'.repeat(501) }).notes).toBeTruthy();
  });
  it('only takes a known show, and nothing the visitor should not set', () => {
    expect(runwayOpinionInput.safeParse({ ...valid, topic: 'made-up-show' }).success).toBe(false);
    expect(runwayOpinionInput.safeParse({ ...valid, status: 'approved' }).success).toBe(false);
    expect(runwayOpinionInput.safeParse({ ...valid, ownerId: 'someone-else' }).success).toBe(false);
  });
});

describe('submission', () => {
  it('is saved as a pending Styling Note owned by the visitor, tied to the show, with no song or photos', () => {
    const row = runwayOpinionRow(runwayOpinionInput.parse({ ...valid, notes: ' Saw it twice. ' }), 'user-1', 'Erica');
    expect(row).toMatchObject({
      owner_id: 'user-1', author_display_name: 'Erica', kind: 'runway_opinion', topic: 'thom-browne-fw17', status: 'pending',
      title: valid.title, styling_idea: valid.opinion, extra_notes: 'Saw it twice.',
      song_artist: '', song_track: '', song_reason: '', photo_paths: [], photo_alts: [],
    });
    expect(row.tags).toEqual(['thom browne', 'fw17', 'runway film']);
  });
  it('signs a visitor with no display name as a reader', () => {
    expect(runwayOpinionRow(runwayOpinionInput.parse(valid), 'user-1', '  ').author_display_name).toBe('Melody Lust reader');
  });
});

describe('moderation', () => {
  const now = new Date('2026-11-22T12:00:00Z');
  it('lets moderators and admins review, nobody else', () => {
    expect(canModerate(['user', 'moderator'])).toBe(true);
    expect(canModerate(['admin'])).toBe(true);
    expect(canModerate(['user'])).toBe(false);
    expect(canModerate([])).toBe(false);
  });
  it('records who approved it and when, clearing any old reason', () => {
    expect(reviewChange('approved', 'ignored', 'mod-1', now)).toEqual({ status: 'approved', rejection_reason: null, reviewed_by: 'mod-1', reviewed_at: now.toISOString() });
  });
  it('keeps a rejection reason for the author', () => {
    expect(reviewChange('rejected', ' Off topic. ', 'mod-1', now).rejection_reason).toBe('Off topic.');
    expect(reviewChange('rejected', undefined, 'mod-1', now).rejection_reason).toBe('Not approved.');
  });
});
