CREATE TABLE IF NOT EXISTS public.style_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id text NOT NULL,
  look_id text NOT NULL,
  voter text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT style_votes_one_per_item UNIQUE (item_id, voter)
);
GRANT ALL ON public.style_votes TO service_role;
ALTER TABLE public.style_votes ENABLE ROW LEVEL SECURITY;