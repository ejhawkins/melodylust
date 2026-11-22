-- The stylist brief: optional toggle answers (occasion, dress level, lead colour, silhouette, shoes, season, avoid).
-- Validated by the app (src/lib/stylist-brief.ts); the database only keeps it an object of sane size.
ALTER TABLE public.style_boards
  ADD COLUMN brief jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(brief) = 'object' AND pg_column_size(brief) <= 4096);

-- Shared links now carry the brief. The return type changes, so the function is dropped and made again.
DROP FUNCTION IF EXISTS public.get_style_board(text);
CREATE FUNCTION public.get_style_board(_id text)
RETURNS TABLE (id text, author_display_name text, title text, note text, items jsonb, created_at timestamptz, brief jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.author_display_name, b.title, b.note, b.items, b.created_at, b.brief FROM public.style_boards b WHERE b.id = _id AND b.status = 'approved'
$$;
REVOKE ALL ON FUNCTION public.get_style_board(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_style_board(text) TO anon, authenticated, service_role;
