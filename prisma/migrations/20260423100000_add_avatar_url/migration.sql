-- Adds avatarUrl to User for profile pictures.
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;

-- ── Supabase Storage setup (run once) ──────────────────────────
-- If the `avatars` bucket doesn't exist yet, create it here. Safe to re-run.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policies: authenticated users can upload/update/delete objects inside a
-- folder named after their own auth.users.id. Anyone can read (public bucket).
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users manage own avatar" ON storage.objects;
CREATE POLICY "Users manage own avatar"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
