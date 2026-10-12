CREATE POLICY "Authors upload styling note photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'styling-notes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authors read own styling note photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'styling-notes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authors update own styling note photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'styling-notes' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'styling-notes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authors delete own styling note photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'styling-notes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE OR REPLACE FUNCTION public.sync_note_review_metadata()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  new.updated_at = now();
  IF new.status = 'pending' THEN
    new.reviewed_at = NULL;
    new.reviewed_by = NULL;
    new.rejection_reason = NULL;
  ELSIF new.status IS DISTINCT FROM old.status THEN
    new.reviewed_at = now();
  END IF;
  RETURN new;
END;
$$;
DROP TRIGGER styling_note_updated ON public.styling_notes;
CREATE TRIGGER styling_note_updated BEFORE UPDATE ON public.styling_notes FOR EACH ROW EXECUTE FUNCTION public.sync_note_review_metadata();