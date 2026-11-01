ALTER TABLE public.articles ADD COLUMN source text NOT NULL DEFAULT 'melodylust';
CREATE UNIQUE INDEX articles_url_key ON public.articles (url);