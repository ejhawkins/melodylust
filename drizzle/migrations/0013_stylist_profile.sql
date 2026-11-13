ALTER TABLE public.profiles
  ADD COLUMN bio text NOT NULL DEFAULT '' CHECK (char_length(bio) <= 1200),
  ADD COLUMN inspirations text NOT NULL DEFAULT '' CHECK (char_length(inspirations) <= 600),
  ADD COLUMN portfolio jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(portfolio) = 'array' AND jsonb_array_length(portfolio) <= 12);

CREATE OR REPLACE FUNCTION public.get_stylist_profile(_board_id text)
RETURNS TABLE (bio text, inspirations text, portfolio jsonb, notes jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH o AS (SELECT s.owner_id FROM public.style_boards s WHERE s.id = _board_id AND s.status = 'approved')
  SELECT coalesce(p.bio, ''), coalesce(p.inspirations, ''), coalesce(p.portfolio, '[]'::jsonb),
    (SELECT coalesce(jsonb_agg(jsonb_build_object('title', n.title, 'idea', n.styling_idea, 'tags', n.tags,
        'artist', n.song_artist, 'track', n.song_track, 'reason', n.song_reason, 'createdAt', n.created_at) ORDER BY n.created_at DESC), '[]'::jsonb)
     FROM public.styling_notes n WHERE n.owner_id = o.owner_id AND n.status = 'approved')
  FROM o LEFT JOIN public.profiles p ON p.id = o.owner_id
$$;
REVOKE ALL ON FUNCTION public.get_stylist_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_stylist_profile(text) TO anon, authenticated, service_role;