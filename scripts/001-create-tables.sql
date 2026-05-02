-- Physics Platform Database Schema
-- Run this script to create all necessary tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Students table (extends auth.users)
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  subscription_type VARCHAR(50) DEFAULT 'free' CHECK (subscription_type IN ('free', 'monthly', 'premium')),
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER DEFAULT 0, -- in minutes
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_free BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PDFs/Materials table
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_size INTEGER DEFAULT 0, -- in bytes
  file_type VARCHAR(50) DEFAULT 'pdf',
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_free BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  target_audience VARCHAR(20) DEFAULT 'all' CHECK (target_audience IN ('all', 'free', 'premium')),
  is_pinned BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  reply TEXT,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lesson Progress table
CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0, -- percentage 0-100
  completed BOOLEAN DEFAULT false,
  last_watched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, lesson_id)
);

-- Material Downloads table
CREATE TABLE IF NOT EXISTS material_downloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, material_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_lessons_category ON lessons(category_id);
CREATE INDEX IF NOT EXISTS idx_lessons_free ON lessons(is_free);
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_student ON lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON announcements(is_pinned);

-- Row Level Security Policies

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_downloads ENABLE ROW LEVEL SECURITY;

-- Students policies
CREATE POLICY "Students can view their own profile" ON students
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Students can update their own profile" ON students
  FOR UPDATE USING (auth.uid() = id);

-- Lessons policies (public read for free, authenticated for paid)
CREATE POLICY "Anyone can view free lessons" ON lessons
  FOR SELECT USING (is_free = true AND is_published = true);

CREATE POLICY "Authenticated users can view all published lessons" ON lessons
  FOR SELECT USING (auth.role() = 'authenticated' AND is_published = true);

-- Materials policies
CREATE POLICY "Anyone can view free materials" ON materials
  FOR SELECT USING (is_free = true AND is_published = true);

CREATE POLICY "Authenticated users can view all published materials" ON materials
  FOR SELECT USING (auth.role() = 'authenticated' AND is_published = true);

-- Announcements policies
CREATE POLICY "Anyone can view published announcements" ON announcements
  FOR SELECT USING (is_published = true);

-- Messages policies
CREATE POLICY "Students can view their own messages" ON messages
  FOR SELECT USING (auth.uid() = sender_id);

CREATE POLICY "Students can create messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Lesson progress policies
CREATE POLICY "Students can view their own progress" ON lesson_progress
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can update their own progress" ON lesson_progress
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can modify their own progress" ON lesson_progress
  FOR UPDATE USING (auth.uid() = student_id);

-- Material downloads policies
CREATE POLICY "Students can view their own downloads" ON material_downloads
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can record downloads" ON material_downloads
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_progress_updated_at BEFORE UPDATE ON lesson_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
