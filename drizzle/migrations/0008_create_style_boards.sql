CREATE TABLE public.style_boards (
  id text PRIMARY KEY,
  owner_id uuid NOT NULL,
  author_display_name text NOT NULL CHECK (char_length(author_display_name) BETWEEN 1 AND 60),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  note text NOT NULL CHECK (char_length(note) BETWEEN 10 AND 2000),
  items jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) BETWEEN 1 AND 24),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX style_boards_owner_idx ON public.style_boards (owner_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.style_boards TO authenticated;
GRANT ALL ON public.style_boards TO service_role;
ALTER TABLE public.style_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own boards" ON public.style_boards FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners create boards" ON public.style_boards FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners delete boards" ON public.style_boards FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.get_style_board(_id text)
RETURNS TABLE (id text, author_display_name text, title text, note text, items jsonb, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.author_display_name, b.title, b.note, b.items, b.created_at FROM public.style_boards b WHERE b.id = _id
$$;
REVOKE ALL ON FUNCTION public.get_style_board(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_style_board(text) TO anon, authenticated, service_role;