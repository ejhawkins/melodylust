CREATE OR REPLACE FUNCTION public.get_influencer_boards(_board_id text)
RETURNS TABLE (id text, author_display_name text, title text, note text, items jsonb, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.author_display_name, b.title, b.note, b.items, b.created_at
  FROM public.style_boards b
  WHERE b.status = 'approved'
    AND b.owner_id = (SELECT s.owner_id FROM public.style_boards s WHERE s.id = _board_id AND s.status = 'approved')
  ORDER BY b.created_at DESC LIMIT 60
$$;
REVOKE ALL ON FUNCTION public.get_influencer_boards(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_influencer_boards(text) TO anon, authenticated, service_role;