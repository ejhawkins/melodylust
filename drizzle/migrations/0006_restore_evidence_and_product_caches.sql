CREATE TABLE IF NOT EXISTS public.article_evidence (
 fingerprint text PRIMARY KEY,
 reader text NOT NULL,
 article_url text NOT NULL,
 evidence jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.article_evidence TO service_role;
REVOKE ALL ON public.article_evidence FROM anon, authenticated;
ALTER TABLE public.article_evidence ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS article_evidence_reader_idx ON public.article_evidence (reader);
CREATE TABLE IF NOT EXISTS public.product_cache (
 key text PRIMARY KEY,
 products jsonb NOT NULL,
 saved_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.product_cache TO service_role;
REVOKE ALL ON public.product_cache FROM anon, authenticated;
ALTER TABLE public.product_cache ENABLE ROW LEVEL SECURITY;