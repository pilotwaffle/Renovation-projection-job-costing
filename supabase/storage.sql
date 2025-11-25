-- Supabase Storage Configuration for Photo Attachments
-- Run these SQL commands in Supabase SQL Editor after migration

-- Create storage bucket for scope item photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'scope-item-photos',
  'scope-item-photos',
  false, -- Private bucket, access via signed URLs
  10485760, -- 10MB file size limit per photo
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies for the scope-item-photos bucket

-- Users can upload photos to their own scope items
CREATE POLICY "Users can upload photos to their scope items" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'scope-item-photos'
    AND auth.role() = 'authenticated'
    AND (
      -- Extract scope_item_id from path (format: {user_id}/{job_id}/{scope_item_id}/{filename})
      (split_part(name, '/', 3))::uuid IN (
        SELECT si.id FROM scope_items si
        JOIN budget_versions bv ON si.budget_version_id = bv.id
        JOIN jobs j ON bv.job_id = j.id
        WHERE j.user_id = auth.uid()
      )
    )
  );

-- Users can read their own photos
CREATE POLICY "Users can read their own photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'scope-item-photos'
    AND (
      -- User owns the photo (user_id matches first part of path)
      split_part(name, '/', 1) = auth.uid()::text
      OR
      -- OR user has access to the job containing this photo
      EXISTS (
        SELECT 1 FROM scope_items si
        JOIN budget_versions bv ON si.budget_version_id = bv.id
        JOIN jobs j ON bv.job_id = j.id
        JOIN scope_item_photos sp ON si.id = sp.scope_item_id
        WHERE j.user_id = auth.uid()
        AND sp.file_path = storage.foldername(name)
      )
    )
  );

-- Users can update their own photos
CREATE POLICY "Users can update their own photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'scope-item-photos'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Users can delete their own photos
CREATE POLICY "Users can delete their own photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'scope-item-photos'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Function to generate storage path for photos
CREATE OR REPLACE FUNCTION generate_photo_path(
  p_user_id UUID,
  p_job_id UUID,
  p_scope_item_id UUID,
  p_file_name TEXT
)
RETURNS TEXT AS $$
BEGIN
  -- Generate path in format: {user_id}/{job_id}/{scope_item_id}/{timestamp}_{filename}
  RETURN format('%s/%s/%s/%s_%s',
    p_user_id::text,
    p_job_id::text,
    p_scope_item_id::text,
    EXTRACT(epoch FROM now())::bigint,
    p_file_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to a photo
CREATE OR REPLACE FUNCTION has_photo_access(p_photo_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_scope_item_id UUID;
BEGIN
  -- Get the user_id and scope_item_id for the photo
  SELECT sp.user_id, sp.scope_item_id
  INTO v_user_id, v_scope_item_id
  FROM scope_item_photos sp
  WHERE sp.id = p_photo_id;

  -- Check if current user is the photo owner
  IF v_user_id = auth.uid() THEN
    RETURN true;
  END IF;

  -- Check if current user has access to the job containing this photo
  RETURN EXISTS (
    SELECT 1 FROM scope_items si
    JOIN budget_versions bv ON si.budget_version_id = bv.id
    JOIN jobs j ON bv.job_id = j.id
    WHERE si.id = v_scope_item_id
    AND j.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up orphaned photos
CREATE OR REPLACE FUNCTION cleanup_orphaned_photos()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_file_path TEXT;
BEGIN
  -- Find photos that no longer have corresponding database records
  FOR v_file_path IN
    SELECT storage.foldername(name)
    FROM storage.objects
    WHERE bucket_id = 'scope-item-photos'
    AND NOT EXISTS (
      SELECT 1 FROM scope_item_photos sp
      WHERE sp.file_path = storage.foldername(name)
    )
  LOOP
    -- Delete orphaned files
    DELETE FROM storage.objects
    WHERE bucket_id = 'scope-item-photos'
    AND storage.foldername(name) = v_file_path;

    v_deleted_count := v_deleted_count + 1;
  END LOOP;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for storage functions
GRANT EXECUTE ON FUNCTION generate_photo_path(UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION has_photo_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_photos() TO authenticated;

-- Create a scheduled job to clean up orphaned photos (run daily)
-- Note: This would need to be set up via Supabase cron jobs or external scheduler

-- Create helpful view for photo storage stats
CREATE OR REPLACE VIEW photo_storage_stats AS
SELECT
  COUNT(*) as total_files,
  ROUND(SUM(o.size) / 1024.0 / 1024.0, 2) as total_size_mb,
  ROUND(AVG(o.size) / 1024.0, 2) as avg_size_kb,
  COUNT(DISTINCT split_part(o.name, '/', 1)) as unique_users,
  COUNT(DISTINCT split_part(o.name, '/', 2)) as unique_jobs,
  COUNT(DISTINCT split_part(o.name, '/', 3)) as unique_scope_items
FROM storage.objects o
WHERE o.bucket_id = 'scope-item-photos';

GRANT SELECT ON photo_storage_stats TO authenticated;

-- Add comments
COMMENT ON POLICY "Users can upload photos to their scope items" ON storage.objects IS 'Allows authenticated users to upload photos to scope items they own';
COMMENT ON POLICY "Users can read their own photos" ON storage.objects IS 'Allows users to read their own photos and photos from jobs they have access to';
COMMENT ON FUNCTION generate_photo_path IS 'Generates a unique storage path for photos with timestamp prefix';
COMMENT ON FUNCTION has_photo_access IS 'Checks if current user has access to a specific photo';
COMMENT ON FUNCTION cleanup_orphaned_photos IS 'Removes storage files that no longer have database records';
COMMENT ON VIEW photo_storage_stats IS 'Storage usage statistics for photos bucket';