ALTER TABLE public.style_boards
  ADD COLUMN status public.styling_note_status NOT NULL DEFAULT 'pending',
  ADD COLUMN rejection_reason text,
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN reviewed_by uuid;
CREATE INDEX style_boards_status_idx ON public.style_boards (status, created_at DESC);
GRANT UPDATE ON public.style_boards TO authenticated;

DROP POLICY "Owners create boards" ON public.style_boards;
CREATE POLICY "Owners create pending boards" ON public.style_boards FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id AND status = 'pending' AND reviewed_at IS NULL AND reviewed_by IS NULL);
CREATE POLICY "Moderators read boards" ON public.style_boards FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Moderators review boards" ON public.style_boards FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

-- Shared links and the public gallery only ever show approved boards.
CREATE OR REPLACE FUNCTION public.get_style_board(_id text)
RETURNS TABLE (id text, author_display_name text, title text, note text, items jsonb, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.author_display_name, b.title, b.note, b.items, b.created_at FROM public.style_boards b WHERE b.id = _id AND b.status = 'approved'
$$;
CREATE OR REPLACE FUNCTION public.list_style_boards(_limit int DEFAULT 24)
RETURNS TABLE (id text, author_display_name text, title text, note text, items jsonb, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.author_display_name, b.title, b.note, b.items, b.created_at FROM public.style_boards b
  WHERE b.status = 'approved' ORDER BY b.created_at DESC LIMIT LEAST(GREATEST(_limit, 1), 60)
$$;
REVOKE ALL ON FUNCTION public.list_style_boards(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_style_boards(int) TO anon, authenticated, service_role;