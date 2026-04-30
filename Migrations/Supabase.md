# For creating tables

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (stores user names and info)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_history table (stores all chat messages)
CREATE TABLE public.chat_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  message_text TEXT NOT NULL,
  mode TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create generated_images table (stores image generation history)
CREATE TABLE public.generated_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  mode TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create generated_videos table (stores video generation history)
CREATE TABLE public.generated_videos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create memory_game_sessions table (stores memory game results)
CREATE TABLE public.memory_game_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  level_reached INTEGER NOT NULL,
  moves_used INTEGER NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create colors_shapes_sessions table (stores colors & shapes game results)
CREATE TABLE public.colors_shapes_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL CHECK (game_type IN ('colors', 'shapes')),
  level_reached INTEGER NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_chat_history_user_id ON public.chat_history(user_id);
CREATE INDEX idx_chat_history_created_at ON public.chat_history(created_at);
CREATE INDEX idx_generated_images_user_id ON public.generated_images(user_id);
CREATE INDEX idx_generated_videos_user_id ON public.generated_videos(user_id);
CREATE INDEX idx_memory_game_user_id ON public.memory_game_sessions(user_id);
CREATE INDEX idx_colors_shapes_user_id ON public.colors_shapes_sessions(user_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colors_shapes_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for chat_history
CREATE POLICY "Users can view their own chat history"
  ON public.chat_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat messages"
  ON public.chat_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for generated_images
CREATE POLICY "Users can view their own generated images"
  ON public.generated_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own image generations"
  ON public.generated_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for generated_videos
CREATE POLICY "Users can view their own generated videos"
  ON public.generated_videos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own video generations"
  ON public.generated_videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for memory_game_sessions
CREATE POLICY "Users can view their own memory game sessions"
  ON public.memory_game_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memory game sessions"
  ON public.memory_game_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for colors_shapes_sessions
CREATE POLICY "Users can view their own colors & shapes sessions"
  ON public.colors_shapes_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own colors & shapes sessions"
  ON public.colors_shapes_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'Friend'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile automatically
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

```sql
-- Add level and progress fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN user_level INTEGER DEFAULT 1,
ADD COLUMN session_start_time BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000;

-- Create a table to track level history
CREATE TABLE public.user_level_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  reached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_level_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can view their own level history"
  ON public.user_level_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own level history"
  ON public.user_level_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index
CREATE INDEX idx_user_level_history_user_id ON public.user_level_history(user_id);
```

```sql
-- Add columns to store image/video data
ALTER TABLE public.generated_images
ADD COLUMN image_data TEXT,
ADD COLUMN mime_type TEXT;

ALTER TABLE public.generated_videos
ADD COLUMN video_data TEXT,
ADD COLUMN mime_type TEXT;
```

```sql
-- Add a thumbnail column for faster loading
ALTER TABLE public.generated_images
ADD COLUMN thumbnail_data TEXT;

ALTER TABLE public.generated_videos
ADD COLUMN thumbnail_data TEXT;
```

```sql
-- Add terms acceptance column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_terms_accepted 
ON public.profiles(terms_accepted);
```

```sql
-- Create schools table
CREATE TABLE public.schools (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_name TEXT NOT NULL UNIQUE,
  principal_email TEXT NOT NULL,
  counselor_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create teachers table
CREATE TABLE public.teachers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_name TEXT NOT NULL,
  teacher_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read schools and teachers (for signup)
CREATE POLICY "Anyone can view schools"
  ON public.schools FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view teachers"
  ON public.teachers FOR SELECT
  USING (true);

-- Add indexes
CREATE INDEX idx_teachers_school_id ON public.teachers(school_id);

-- Insert 5 sample schools
INSERT INTO public.schools (school_name, principal_email, counselor_email) VALUES
('Greenwood Elementary School', 'principal@greenwood.edu', 'counselor@greenwood.edu'),
('Riverside High School', 'principal@riverside.edu', 'counselor@riverside.edu'),
('Maple Academy', 'principal@mapleacademy.edu', 'counselor@mapleacademy.edu'),
('Sunshine Learning Center', 'principal@sunshine.edu', 'counselor@sunshine.edu'),
('Oak Valley School', 'principal@oakvalley.edu', 'counselor@oakvalley.edu');

-- Insert 5 teachers for each school (25 total)
-- Greenwood Elementary School
INSERT INTO public.teachers (school_id, teacher_name, teacher_email)
SELECT id, 'Ms. Sarah Johnson', 'sarah.johnson@greenwood.edu' FROM public.schools WHERE school_name = 'Greenwood Elementary School'
UNION ALL
SELECT id, 'Mr. David Smith', 'david.smith@greenwood.edu' FROM public.schools WHERE school_name = 'Greenwood Elementary School'
UNION ALL
SELECT id, 'Mrs. Emily Brown', 'emily.brown@greenwood.edu' FROM public.schools WHERE school_name = 'Greenwood Elementary School'
UNION ALL
SELECT id, 'Mr. James Wilson', 'james.wilson@greenwood.edu' FROM public.schools WHERE school_name = 'Greenwood Elementary School'
UNION ALL
SELECT id, 'Ms. Lisa Anderson', 'lisa.anderson@greenwood.edu' FROM public.schools WHERE school_name = 'Greenwood Elementary School';

-- Riverside High School
INSERT INTO public.teachers (school_id, teacher_name, teacher_email)
SELECT id, 'Dr. Michael Chen', 'michael.chen@riverside.edu' FROM public.schools WHERE school_name = 'Riverside High School'
UNION ALL
SELECT id, 'Ms. Jennifer Martinez', 'jennifer.martinez@riverside.edu' FROM public.schools WHERE school_name = 'Riverside High School'
UNION ALL
SELECT id, 'Mr. Robert Taylor', 'robert.taylor@riverside.edu' FROM public.schools WHERE school_name = 'Riverside High School'
UNION ALL
SELECT id, 'Mrs. Amanda White', 'amanda.white@riverside.edu' FROM public.schools WHERE school_name = 'Riverside High School'
UNION ALL
SELECT id, 'Mr. Christopher Lee', 'christopher.lee@riverside.edu' FROM public.schools WHERE school_name = 'Riverside High School';

-- Maple Academy
INSERT INTO public.teachers (school_id, teacher_name, teacher_email)
SELECT id, 'Ms. Patricia Garcia', 'patricia.garcia@mapleacademy.edu' FROM public.schools WHERE school_name = 'Maple Academy'
UNION ALL
SELECT id, 'Mr. Daniel Rodriguez', 'daniel.rodriguez@mapleacademy.edu' FROM public.schools WHERE school_name = 'Maple Academy'
UNION ALL
SELECT id, 'Mrs. Maria Hernandez', 'maria.hernandez@mapleacademy.edu' FROM public.schools WHERE school_name = 'Maple Academy'
UNION ALL
SELECT id, 'Mr. Richard Moore', 'richard.moore@mapleacademy.edu' FROM public.schools WHERE school_name = 'Maple Academy'
UNION ALL
SELECT id, 'Ms. Linda Jackson', 'linda.jackson@mapleacademy.edu' FROM public.schools WHERE school_name = 'Maple Academy';

-- Sunshine Learning Center
INSERT INTO public.teachers (school_id, teacher_name, teacher_email)
SELECT id, 'Dr. Susan Thompson', 'susan.thompson@sunshine.edu' FROM public.schools WHERE school_name = 'Sunshine Learning Center'
UNION ALL
SELECT id, 'Mr. Kevin Harris', 'kevin.harris@sunshine.edu' FROM public.schools WHERE school_name = 'Sunshine Learning Center'
UNION ALL
SELECT id, 'Mrs. Nancy Clark', 'nancy.clark@sunshine.edu' FROM public.schools WHERE school_name = 'Sunshine Learning Center'
UNION ALL
SELECT id, 'Mr. Brian Lewis', 'brian.lewis@sunshine.edu' FROM public.schools WHERE school_name = 'Sunshine Learning Center'
UNION ALL
SELECT id, 'Ms. Karen Walker', 'karen.walker@sunshine.edu' FROM public.schools WHERE school_name = 'Sunshine Learning Center';

-- Oak Valley School
INSERT INTO public.teachers (school_id, teacher_name, teacher_email)
SELECT id, 'Ms. Jessica Hall', 'jessica.hall@oakvalley.edu' FROM public.schools WHERE school_name = 'Oak Valley School'
UNION ALL
SELECT id, 'Mr. Thomas Allen', 'thomas.allen@oakvalley.edu' FROM public.schools WHERE school_name = 'Oak Valley School'
UNION ALL
SELECT id, 'Mrs. Barbara Young', 'barbara.young@oakvalley.edu' FROM public.schools WHERE school_name = 'Oak Valley School'
UNION ALL
SELECT id, 'Mr. Charles King', 'charles.king@oakvalley.edu' FROM public.schools WHERE school_name = 'Oak Valley School'
UNION ALL
SELECT id, 'Ms. Elizabeth Wright', 'elizabeth.wright@oakvalley.edu' FROM public.schools WHERE school_name = 'Oak Valley School';
```

```sql
-- Add school_id and teacher_id to profiles
ALTER TABLE public.profiles
ADD COLUMN school_id UUID REFERENCES public.schools(id) DEFAULT NULL,
ADD COLUMN assigned_teacher_id UUID REFERENCES public.teachers(id) DEFAULT NULL;

-- Set existing users to NULL (as you requested)
UPDATE public.profiles SET school_id = NULL, assigned_teacher_id = NULL;

-- Create index
CREATE INDEX idx_profiles_school_id ON public.profiles(school_id);
CREATE INDEX idx_profiles_teacher_id ON public.profiles(assigned_teacher_id);
```

```sql
-- Table to log all flagged messages
CREATE TABLE public.safety_alerts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  flagged_message TEXT NOT NULL,
  detection_method TEXT NOT NULL, -- 'keyword' or 'ai_analysis'
  severity_level TEXT NOT NULL, -- 'low', 'medium', 'high'
  emails_sent_to TEXT[], -- Array of emails notified
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.safety_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can view alerts (you can modify this later)
CREATE POLICY "Admins can view all alerts"
  ON public.safety_alerts FOR SELECT
  USING (true);

CREATE POLICY "System can insert alerts"
  ON public.safety_alerts FOR INSERT
  WITH CHECK (true);

-- Create index
CREATE INDEX idx_safety_alerts_user_id ON public.safety_alerts(user_id);
CREATE INDEX idx_safety_alerts_created_at ON public.safety_alerts(created_at DESC);
```

```sql
-- Update all principal emails
UPDATE public.schools
SET principal_email = 'yugesh.sendelightgifts@gmail.com';

-- Update all counselor emails
UPDATE public.schools
SET counselor_email = 'yugesh.kerckhoffs@gmail.com';

-- Update all teacher emails
UPDATE public.teachers
SET teacher_email = 'imyugesh.s@gmail.com';

-- Verify the updates
SELECT 
  'Schools' as table_name,
  COUNT(*) as total_rows,
  COUNT(DISTINCT principal_email) as unique_principal_emails,
  COUNT(DISTINCT counselor_email) as unique_counselor_emails
FROM public.schools

UNION ALL

SELECT 
  'Teachers' as table_name,
  COUNT(*) as total_rows,
  COUNT(DISTINCT teacher_email) as unique_teacher_emails,
  NULL as counselor_count
FROM public.teachers;
```

```sql
-- Check all school emails
SELECT 
  school_name, 
  principal_email, 
  counselor_email 
FROM public.schools
ORDER BY school_name;

-- Check all teacher emails
SELECT 
  s.school_name,
  t.teacher_name,
  t.teacher_email
FROM public.teachers t
JOIN public.schools s ON t.school_id = s.id
ORDER BY s.school_name, t.teacher_name;
```

```sql
-- Check if your profile exists
SELECT * FROM public.profiles 
WHERE id = '05155f45-2e35-4d8c-9f23-0018604d9262';

-- If it doesn't exist or missing data, update it:
UPDATE public.profiles
SET 
  school_id = (SELECT id FROM public.schools LIMIT 1),
  assigned_teacher_id = (SELECT id FROM public.teachers LIMIT 1)
WHERE id = '05155f45-2e35-4d8c-9f23-0018604d9262';
```

```sql
CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts" ON public.contact_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow admin read" ON public.contact_messages
  FOR SELECT USING (true);
```

```sql
-- Add emails_to_notify column and remove emails_sent_to
ALTER TABLE public.safety_alerts 
ADD COLUMN IF NOT EXISTS emails_to_notify TEXT[];

ALTER TABLE public.safety_alerts 
DROP COLUMN IF EXISTS emails_sent_to;
```

```sql
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT 'false'::jsonb,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.app_settings (key, value) VALUES ('maintenance_mode', 'false'::jsonb);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app_settings"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (true);
```

```sql
-- ============================================
-- SUBSCRIPTION & USAGE TRACKING TABLES
-- ============================================

-- User subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  months_purchased integer DEFAULT 0,
  amount_paid numeric(10,2) DEFAULT 0,
  stripe_session_id text,
  stripe_payment_intent_id text,
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Usage tracking table (monthly reset)
CREATE TABLE IF NOT EXISTS public.user_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year text NOT NULL, -- format: '2026-03'
  images_generated integer DEFAULT 0,
  videos_generated integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, month_year)
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_subscriptions
CREATE POLICY "Users can read own subscriptions"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON public.user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON public.user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS policies for user_usage
CREATE POLICY "Users can read own usage"
  ON public.user_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON public.user_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON public.user_usage FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role policy for edge functions to manage subscriptions
CREATE POLICY "Service role full access subscriptions"
  ON public.user_subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access usage"
  ON public.user_usage FOR ALL
  USING (true)
  WITH CHECK (true);

-- Set all existing users as free (add plan column to profiles if not exists)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free';
UPDATE public.profiles SET plan = 'free' WHERE plan IS NULL;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_active ON public.user_subscriptions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_usage_user_month ON public.user_usage(user_id, month_year);

```

```sql
CREATE TABLE IF NOT EXISTS public.api_health_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at timestamptz NOT NULL DEFAULT now(),
  function_name text NOT NULL,
  status text NOT NULL, -- 'healthy', 'error', 'unreachable'
  response_time_ms integer,
  error_message text,
  overall_status text
);

-- Index for quick lookups
CREATE INDEX idx_health_logs_checked_at ON public.api_health_logs(checked_at DESC);
CREATE INDEX idx_health_logs_status ON public.api_health_logs(status);

-- Allow service role to insert
ALTER TABLE public.api_health_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.api_health_logs FOR ALL USING (true) WITH CHECK (true);

```

```sql
ALTER TABLE profiles ADD COLUMN selected_character text DEFAULT null;
```

# For health monitor

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'healthz-monitor-every-10h',
  '0 */10 * * *',
  $$
  SELECT net.http_post(
    url:='<https://wjrjhsllhcjefnittdlv.supabase.co/functions/v1/healthz-monitor>',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indqcmpoc2xsaGNqZWZuaXR0ZGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NjY1NzMsImV4cCI6MjA4MDI0MjU3M30.uRyLsoKp3adnyrtfYedN0z-sVjilIE6WRikuYYmi9Bw"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);

```

```sql
-- Function that keeps only the latest 100 rows
CREATE OR REPLACE FUNCTION cleanup_api_health_logs()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM api_health_logs
  WHERE id NOT IN (
    SELECT id FROM api_health_logs
    ORDER BY checked_at DESC
    LIMIT 100
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: runs after every INSERT
CREATE OR REPLACE TRIGGER trg_cleanup_api_health_logs
AFTER INSERT ON api_health_logs
FOR EACH ROW
EXECUTE FUNCTION cleanup_api_health_logs();
```

# Settings

```sql
Authentication -> email -> confirm signup

<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Confirm your email</title>
</head>

<body style="margin:0; padding:0; background:#f6f7fb; font-family:Arial, sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center">

<table width="600" style="background:white; border-radius:12px; padding:40px; margin-top:40px; box-shadow:0 4px 20px rgba(0,0,0,0.05);">

<tr>
<td align="center">

<h1 style="color:#8B5CF6; margin-bottom:10px;">
🧠 Sendelightgifts  AiBuddy
</h1>

<p style="font-size:18px; color:#444;">
Welcome to your AI Learning Assistant!
</p>

</td>
</tr>

<tr>
<td style="padding:20px 0; text-align:center;">

<p style="color:#666; font-size:16px;">
Please confirm your email to start exploring games, stories, and AI tools designed for learning.
</p>

<a href="{{ .ConfirmationURL }}"
style="
display:inline-block;
background:#8B5CF6;
color:white;
padding:14px 28px;
text-decoration:none;
border-radius:8px;
font-weight:bold;
margin-top:20px;
">

Confirm Your Email 🚀

</a>

</td>
</tr>

<tr>
<td style="padding-top:30px; text-align:center; font-size:12px; color:#999;">

<p>If the button doesn't work, copy this link:</p>
<p style="word-break:break-all;">
{{ .ConfirmationURL }}
</p>

</td>
</tr>

<tr>
<td style="padding-top:30px; text-align:center; font-size:12px; color:#aaa;">

<p>
Made with ❤️ by Sendelightgifts
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>

```

```sql
Authentication -> email -> reset password

<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Reset Your Password</title>
</head>

<body style="margin:0; padding:0; background:#f6f7fb; font-family:Arial, sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center">

<table width="600" style="background:white; border-radius:12px; padding:40px; margin-top:40px; box-shadow:0 4px 20px rgba(0,0,0,0.05);">

<tr>
<td align="center">

<h1 style="color:#8B5CF6; margin-bottom:10px;">
🧠 Sendelightgifts  AiBuddy
</h1>

<p style="font-size:18px; color:#444;">
Password Reset Request
</p>

</td>
</tr>

<tr>
<td style="padding:20px 0; text-align:center;">

<p style="color:#666; font-size:16px;">
We received a request to reset your password. Click the button below to create a new one.
</p>

<a href="{{ .ConfirmationURL }}"
style="
display:inline-block;
background:#8B5CF6;
color:white;
padding:14px 28px;
text-decoration:none;
border-radius:8px;
font-weight:bold;
margin-top:20px;
">

Reset Password 🔐

</a>

</td>
</tr>

<tr>
<td style="padding-top:25px; text-align:center; font-size:14px; color:#888;">

<p>This link will expire in <strong>1 hour</strong>.</p>

</td>
</tr>

<tr>
<td style="padding-top:20px; text-align:center; font-size:12px; color:#999;">

<p>If the button doesn't work, copy and paste this link:</p>
<p style="word-break:break-all;">
{{ .ConfirmationURL }}
</p>

</td>
</tr>

<tr>
<td style="padding-top:30px; text-align:center; font-size:12px; color:#aaa;">

<p>
If you didn't request a password reset, you can safely ignore this email.
</p>

<p>
Made with ❤️ by Sendelightgifts
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
```

```latex
Authemtication -> Sign in/ Providers -> confirm email -> toggle on
Authentication -> URL Configuration 

Set domian like  AiBuddy.Sendelightgifts.com

add redirect urls 

1. <https:// AiBuddy.sendelightgifts.com/>
2. <https:// AiBuddy.sendelightgifts.com/**>
```

# Total Schema

```sql
You can see table schema SQl by goto supabase -> database -> copy as sql (at top right corner)
```
