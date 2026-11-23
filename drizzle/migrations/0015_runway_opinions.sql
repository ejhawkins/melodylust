-- Runway Style Opinions: a visitor's take on a runway film, kept in Styling Notes so it shares sign-in, ownership,
-- pending review and moderation. `kind` tells the two apart; an opinion names its show by `topic` (set by the server
-- from a known list, never typed by the visitor), carries the opinion in `styling_idea` and optional `extra_notes`,
-- and has no song or photos. Validated by the app (src/lib/runway-opinion.ts); the database keeps each kind whole.
ALTER TABLE public.styling_notes
  ADD COLUMN kind text NOT NULL DEFAULT 'look' CHECK (kind IN ('look', 'runway_opinion')),
  ADD COLUMN topic text NOT NULL DEFAULT '' CHECK (topic ~ '^[a-z0-9-]{0,80}$'),
  ADD COLUMN extra_notes text NOT NULL DEFAULT '' CHECK (char_length(extra_notes) <= 500);

-- The song and photo checks were written for looks only; drop them (by what they check, as their names were
-- generated) and check each kind instead. The photo_alts-matches-photo_paths check stays.
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.styling_notes'::regclass AND contype = 'c'
      AND (pg_get_constraintdef(oid) ~ '\m(song_artist|song_track|song_reason)\M' OR pg_get_constraintdef(oid) LIKE '%cardinality(photo_paths) >= 1%')
  LOOP
    EXECUTE format('ALTER TABLE public.styling_notes DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.styling_notes
  ADD CONSTRAINT styling_notes_song_photo_limits CHECK (
    char_length(song_artist) <= 120 AND char_length(song_track) <= 160 AND char_length(song_reason) <= 500 AND cardinality(photo_paths) <= 4),
  ADD CONSTRAINT styling_notes_look_complete CHECK (kind <> 'look' OR (
    char_length(song_artist) >= 1 AND char_length(song_track) >= 1 AND char_length(song_reason) >= 3 AND cardinality(photo_paths) >= 1 AND topic = '' AND extra_notes = '')),
  ADD CONSTRAINT styling_notes_opinion_complete CHECK (kind <> 'runway_opinion' OR (
    topic <> '' AND song_artist = '' AND song_track = '' AND song_reason = '' AND cardinality(photo_paths) = 0));

-- Stylist profiles keep listing looks only, as before.
CREATE OR REPLACE FUNCTION public.get_stylist_profile(_board_id text)
RETURNS TABLE (bio text, inspirations text, portfolio jsonb, notes jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH o AS (SELECT s.owner_id FROM public.style_boards s WHERE s.id = _board_id AND s.status = 'approved')
  SELECT coalesce(p.bio, ''), coalesce(p.inspirations, ''), coalesce(p.portfolio, '[]'::jsonb),
    (SELECT coalesce(jsonb_agg(jsonb_build_object('title', n.title, 'idea', n.styling_idea, 'tags', n.tags,
        'artist', n.song_artist, 'track', n.song_track, 'reason', n.song_reason, 'createdAt', n.created_at) ORDER BY n.created_at DESC), '[]'::jsonb)
     FROM public.styling_notes n WHERE n.owner_id = o.owner_id AND n.status = 'approved' AND n.kind = 'look')
  FROM o LEFT JOIN public.profiles p ON p.id = o.owner_id
$$;
REVOKE ALL ON FUNCTION public.get_stylist_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_stylist_profile(text) TO anon, authenticated, service_role;
