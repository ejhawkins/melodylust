CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.styling_note_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '' CHECK (char_length(display_name) <= 60),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.styling_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_display_name text NOT NULL CHECK (char_length(author_display_name) BETWEEN 1 AND 60),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  styling_idea text NOT NULL CHECK (char_length(styling_idea) BETWEEN 10 AND 2000),
  tags text[] NOT NULL DEFAULT '{}',
  song_artist text NOT NULL CHECK (char_length(song_artist) BETWEEN 1 AND 120),
  song_track text NOT NULL CHECK (char_length(song_track) BETWEEN 1 AND 160),
  song_reason text NOT NULL CHECK (char_length(song_reason) BETWEEN 3 AND 500),
  photo_paths text[] NOT NULL CHECK (cardinality(photo_paths) BETWEEN 1 AND 4),
  photo_alts text[] NOT NULL CHECK (cardinality(photo_alts) = cardinality(photo_paths)),
  status public.styling_note_status NOT NULL DEFAULT 'pending',
  rejection_reason text CHECK (rejection_reason IS NULL OR char_length(rejection_reason) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);
GRANT SELECT ON public.styling_notes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.styling_notes TO authenticated;
GRANT ALL ON public.styling_notes TO service_role;
ALTER TABLE public.styling_notes ENABLE ROW LEVEL SECURITY;
CREATE INDEX styling_notes_public_idx ON public.styling_notes (status, created_at DESC);
CREATE INDEX styling_notes_owner_idx ON public.styling_notes (owner_id, created_at DESC);
CREATE POLICY "Approved notes are public" ON public.styling_notes FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "Authors read own notes" ON public.styling_notes FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Moderators read all notes" ON public.styling_notes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authors create pending notes" ON public.styling_notes FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND status = 'pending' AND reviewed_at IS NULL AND reviewed_by IS NULL);
CREATE POLICY "Authors update own notes" ON public.styling_notes FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid() AND status = 'pending' AND reviewed_at IS NULL AND reviewed_by IS NULL);
CREATE POLICY "Authors delete own notes" ON public.styling_notes FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Moderators review notes" ON public.styling_notes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name) VALUES (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 60));
  INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'user');
  RETURN new;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_styling_note()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  new.updated_at = now();
  IF new.status = 'pending' THEN
    new.reviewed_at = NULL;
    new.reviewed_by = NULL;
    new.rejection_reason = NULL;
  END IF;
  RETURN new;
END;
$$;
CREATE TRIGGER styling_note_updated BEFORE UPDATE ON public.styling_notes FOR EACH ROW EXECUTE FUNCTION public.touch_styling_note();