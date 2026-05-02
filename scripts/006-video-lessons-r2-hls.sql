-- R2 / HLS columns for video_lessons (run in Supabase SQL Editor after backup)
ALTER TABLE IF EXISTS video_lessons
  ADD COLUMN IF NOT EXISTS hls_url TEXT,
  ADD COLUMN IF NOT EXISTS youtube_id TEXT;

-- Migrate legacy URLs into HLS master field when applicable
UPDATE video_lessons
SET hls_url = video_url
WHERE hls_url IS NULL
  AND video_url IS NOT NULL
  AND (video_url ILIKE '%.m3u8%' OR video_url LIKE '%/%');

ALTER TABLE IF EXISTS video_lessons
  DROP COLUMN IF EXISTS video_url,
  DROP COLUMN IF EXISTS video_source;
