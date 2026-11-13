CREATE OR REPLACE FUNCTION public.list_influencers(_limit int DEFAULT 48)
RETURNS TABLE (board_id text, author_display_name text, board_count int, items jsonb, latest timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT ON (b.owner_id)
    b.id, b.author_display_name,
    (SELECT count(*)::int FROM public.style_boards c WHERE c.owner_id = b.owner_id AND c.status = 'approved'),
    (SELECT coalesce(jsonb_agg(x.it), '[]'::jsonb) FROM (
       SELECT it FROM public.style_boards c, jsonb_array_elements(c.items) it
       WHERE c.owner_id = b.owner_id AND c.status = 'approved' AND it->>'section' = 'fashion' AND coalesce(it->>'image','') <> ''
       LIMIT 4) x),
    b.created_at
  FROM public.style_boards b
  WHERE b.status = 'approved'
  ORDER BY b.owner_id, b.created_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 100)
$$;
REVOKE ALL ON FUNCTION public.list_influencers(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_influencers(int) TO anon, authenticated, service_role;