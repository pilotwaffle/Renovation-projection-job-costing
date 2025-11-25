-- Photo Attachments Migration
-- Create tables for storing photo metadata and attachments

-- Create scope_item_photos table
CREATE TABLE scope_item_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_item_id UUID NOT NULL REFERENCES scope_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File information
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Storage path in Supabase Storage
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  file_hash TEXT NOT NULL, -- SHA-256 hash for deduplication

  -- Photo metadata
  title TEXT,
  description TEXT,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('progress', 'before', 'after', 'completion', 'issue', 'reference')),
  is_before_after_pair BOOLEAN DEFAULT false,
  paired_photo_id UUID REFERENCES scope_item_photos(id) ON DELETE SET NULL,

  -- Image properties
  width INTEGER,
  height INTEGER,
  aspect_ratio DECIMAL(5,3),
  dominant_color TEXT, -- HEX color code

  -- GPS and location data
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_name TEXT,

  -- Status and organization
  is_primary BOOLEAN DEFAULT false, -- Primary photo for scope item
  is_public BOOLEAN DEFAULT false, -- Can be shared with clients
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  taken_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create photo_annotations table for markup
CREATE TABLE photo_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES scope_item_photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Annotation data
  annotation_type TEXT NOT NULL CHECK (annotation_type IN ('arrow', 'circle', 'rectangle', 'text', 'measurement', 'pin')),
  coordinates JSONB NOT NULL, -- Stores position, size, and shape data
  text_content TEXT,
  color TEXT NOT NULL DEFAULT '#FF0000',
  stroke_width INTEGER DEFAULT 2,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_scope_item_photos_scope_item_id ON scope_item_photos(scope_item_id);
CREATE INDEX idx_scope_item_photos_user_id ON scope_item_photos(user_id);
CREATE INDEX idx_scope_item_photos_photo_type ON scope_item_photos(photo_type);
CREATE INDEX idx_scope_item_photos_created_at ON scope_item_photos(created_at);
CREATE INDEX idx_scope_item_photos_file_hash ON scope_item_photos(file_hash);
CREATE INDEX idx_scope_item_photos_paired_photo_id ON scope_item_photos(paired_photo_id);

CREATE INDEX idx_photo_annotations_photo_id ON photo_annotations(photo_id);
CREATE INDEX idx_photo_annotations_user_id ON photo_annotations(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE scope_item_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_annotations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scope_item_photos
-- Users can view photos for their own jobs
CREATE POLICY "Users can view photos for their jobs" ON scope_item_photos
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM scope_items si
      JOIN budget_versions bv ON si.budget_version_id = bv.id
      JOIN jobs j ON bv.job_id = j.id
      WHERE si.id = scope_item_photos.scope_item_id
      AND j.user_id = auth.uid()
    )
  );

-- Users can insert photos for their own jobs
CREATE POLICY "Users can insert photos for their jobs" ON scope_item_photos
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM scope_items si
      JOIN budget_versions bv ON si.budget_version_id = bv.id
      JOIN jobs j ON bv.job_id = j.id
      WHERE si.id = scope_item_id
      AND j.user_id = auth.uid()
    )
  );

-- Users can update their own photos
CREATE POLICY "Users can update their photos" ON scope_item_photos
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own photos
CREATE POLICY "Users can delete their photos" ON scope_item_photos
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for photo_annotations
-- Users can view annotations on their photos
CREATE POLICY "Users can view annotations on their photos" ON photo_annotations
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM scope_item_photos sp
      WHERE sp.id = photo_annotations.photo_id
      AND sp.user_id = auth.uid()
    )
  );

-- Users can insert annotations on their photos
CREATE POLICY "Users can insert annotations on their photos" ON photo_annotations
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM scope_item_photos sp
      WHERE sp.id = photo_id
      AND sp.user_id = auth.uid()
    )
  );

-- Users can update their annotations
CREATE POLICY "Users can update their annotations" ON photo_annotations
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their annotations
CREATE POLICY "Users can delete their annotations" ON photo_annotations
  FOR DELETE
  USING (user_id = auth.uid());

-- Functions for photo management

-- Function to get photos with stats for a scope item
CREATE OR REPLACE FUNCTION get_scope_item_photos(p_scope_item_id UUID)
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  file_path TEXT,
  file_size BIGINT,
  mime_type TEXT,
  title TEXT,
  description TEXT,
  photo_type TEXT,
  is_before_after_pair BOOLEAN,
  paired_photo_id UUID,
  width INTEGER,
  height INTEGER,
  is_primary BOOLEAN,
  is_public BOOLEAN,
  sort_order INTEGER,
  taken_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  annotations_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id,
    sp.file_name,
    sp.file_path,
    sp.file_size,
    sp.mime_type,
    sp.title,
    sp.description,
    sp.photo_type,
    sp.is_before_after_pair,
    sp.paired_photo_id,
    sp.width,
    sp.height,
    sp.is_primary,
    sp.is_public,
    sp.sort_order,
    sp.taken_at,
    sp.uploaded_at,
    sp.created_at,
    sp.updated_at,
    COALESCE(pa.annotation_count, 0) as annotations_count
  FROM scope_item_photos sp
  LEFT JOIN (
    SELECT photo_id, COUNT(*) as annotation_count
    FROM photo_annotations
    GROUP BY photo_id
  ) pa ON sp.id = pa.photo_id
  WHERE sp.scope_item_id = p_scope_item_id
  ORDER BY sp.sort_order, sp.uploaded_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set primary photo for scope item
CREATE OR REPLACE FUNCTION set_primary_photo(p_photo_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_scope_item_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the scope item and user for this photo
  SELECT scope_item_id, user_id INTO v_scope_item_id, v_user_id
  FROM scope_item_photos
  WHERE id = p_photo_id;

  -- Remove primary flag from all other photos for this scope item
  UPDATE scope_item_photos
  SET is_primary = false
  WHERE scope_item_id = v_scope_item_id
  AND user_id = v_user_id
  AND id != p_photo_id;

  -- Set this photo as primary
  UPDATE scope_item_photos
  SET is_primary = true
  WHERE id = p_photo_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to pair before/after photos
CREATE OR REPLACE FUNCTION pair_before_after_photos(p_before_photo_id UUID, p_after_photo_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_scope_item_id UUID;
  v_user_id UUID;
BEGIN
  -- Verify both photos belong to the same scope item and user
  SELECT scope_item_id, user_id INTO v_scope_item_id, v_user_id
  FROM scope_item_photos
  WHERE id = p_before_photo_id;

  IF NOT EXISTS (
    SELECT 1 FROM scope_item_photos
    WHERE id = p_after_photo_id
    AND scope_item_id = v_scope_item_id
    AND user_id = v_user_id
  ) THEN
    RETURN false;
  END IF;

  -- Update before photo
  UPDATE scope_item_photos
  SET photo_type = 'before',
      is_before_after_pair = true,
      paired_photo_id = p_after_photo_id,
      updated_at = now()
  WHERE id = p_before_photo_id;

  -- Update after photo
  UPDATE scope_item_photos
  SET photo_type = 'after',
      is_before_after_pair = true,
      paired_photo_id = p_before_photo_id,
      updated_at = now()
  WHERE id = p_after_photo_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get photo statistics for a job
CREATE OR REPLACE FUNCTION get_job_photo_stats(p_job_id UUID)
RETURNS TABLE (
  total_photos BIGINT,
  before_photos BIGINT,
  after_photos BIGINT,
  progress_photos BIGINT,
  completion_photos BIGINT,
  issue_photos BIGINT,
  reference_photos BIGINT,
  primary_photos BIGINT,
  public_photos BIGINT,
  before_after_pairs BIGINT,
  total_file_size BIGINT,
  average_file_size DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_photos,
    COUNT(*) FILTER (WHERE photo_type = 'before') as before_photos,
    COUNT(*) FILTER (WHERE photo_type = 'after') as after_photos,
    COUNT(*) FILTER (WHERE photo_type = 'progress') as progress_photos,
    COUNT(*) FILTER (WHERE photo_type = 'completion') as completion_photos,
    COUNT(*) FILTER (WHERE photo_type = 'issue') as issue_photos,
    COUNT(*) FILTER (WHERE photo_type = 'reference') as reference_photos,
    COUNT(*) FILTER (WHERE is_primary = true) as primary_photos,
    COUNT(*) FILTER (WHERE is_public = true) as public_photos,
    COUNT(*) FILTER (WHERE is_before_after_pair = true AND photo_type = 'before') as before_after_pairs,
    COALESCE(SUM(file_size), 0) as total_file_size,
    CASE
      WHEN COUNT(*) > 0 THEN ROUND(AVG(file_size)::numeric, 2)
      ELSE 0
    END as average_file_size
  FROM scope_item_photos sp
  JOIN scope_items si ON sp.scope_item_id = si.id
  JOIN budget_versions bv ON si.budget_version_id = bv.id
  WHERE bv.job_id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scope_item_photos_updated_at
  BEFORE UPDATE ON scope_item_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photo_annotations_updated_at
  BEFORE UPDATE ON photo_annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON scope_item_photos TO authenticated;
GRANT ALL ON photo_annotations TO authenticated;
GRANT EXECUTE ON FUNCTION get_scope_item_photos(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_primary_photo(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION pair_before_after_photos(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_job_photo_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE scope_item_photos IS 'Stores photo attachments for scope items with metadata and organization features';
COMMENT ON TABLE photo_annotations IS 'Stores annotations and markup data for photos';
COMMENT ON COLUMN scope_item_photos.photo_type IS 'Type of photo: progress, before, after, completion, issue, reference';
COMMENT ON COLUMN scope_item_photos.is_before_after_pair IS 'Indicates if this photo is part of a before/after comparison';
COMMENT ON COLUMN scope_item_photos.paired_photo_id IS 'References the paired photo in before/after comparisons';
COMMENT ON COLUMN scope_item_photos.is_primary IS 'Primary photo for the scope item (shown prominently)';
COMMENT ON COLUMN scope_item_photos.is_public IS 'Whether photo can be shared with clients';
COMMENT ON COLUMN photo_annotations.annotation_type IS 'Type of annotation: arrow, circle, rectangle, text, measurement, pin';