```sql
User Id : 34a661c6-aa23-4b8b-8038-a1c1461735ea
```

### 🧪 SQL Query —  Plan Conversion

```sql
# Set users from free to pro 

-- Replace YOUR_USER_ID with the actual user ID
DO $$
DECLARE
  target_user_id uuid := 'YOUR_USER_ID';
BEGIN
  -- Deactivate old subscriptions
  UPDATE public.user_subscriptions SET is_active = false WHERE user_id = target_user_id;
  
  -- Create new 1-month Pro subscription
  INSERT INTO public.user_subscriptions (user_id, plan, months_purchased, amount_paid, expires_at, is_active)
  VALUES (target_user_id, 'pro', 1, 0, now() + interval '1 month', true);
  
  -- Update profile
  UPDATE public.profiles SET plan = 'pro' WHERE id = target_user_id;
END $$;

```

```sql
# Set users from pro to free 

-- Reset user to free plan
UPDATE public.profiles SET plan = 'free' WHERE id = 'YOUR_USER_ID';

-- Deactivate all subscriptions
DELETE FROM public.user_subscriptions WHERE user_id = 'YOUR_USER_ID';

-- Clear usage data
DELETE FROM public.user_usage WHERE user_id = 'YOUR_USER_ID';
```

### 🧪 SQL Query —  Set limitation to full

```sql
# Set generation count to full

INSERT INTO public.user_usage (user_id, month_year, images_generated, videos_generated)
VALUES ('YOUR_USER_ID', to_char(now(), 'YYYY-MM'), 100, 5)
ON CONFLICT (user_id, month_year) 
DO UPDATE SET images_generated = 100, videos_generated = 5;
```

### 🧪 Curl Query — Kill Swich

```powershell
# Kill switch

true - maintanance mode
false - back to live 

# Mac and linux 

curl -X POST <https://wjrjhsllhcjefnittdlv.supabase.co/functions/v1/toggle-maintenance> \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indqcmpoc2xsaGNqZWZuaXR0ZGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NjY1NzMsImV4cCI6MjA4MDI0MjU3M30.uRyLsoKp3adnyrtfYedN0z-sVjilIE6WRikuYYmi9Bw" \\
  -d '{"secretKey": "PoYcTqltb6y1ePRjmsbJgP86C7VyntSr", "enabled": true}'
  
# Windows powershell only (Not for CMD if need replace ` by ^)

curl.exe -X POST <https://wjrjhsllhcjefnittdlv.supabase.co/functions/v1/toggle-maintenance> `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indqcmpoc2xsaGNqZWZuaXR0ZGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NjY1NzMsImV4cCI6MjA4MDI0MjU3M30.uRyLsoKp3adnyrtfYedN0z-sVjilIE6WRikuYYmi9Bw" `
  -d "{\\`"secretKey\\`": \\`"PoYcTqltb6y1ePRjmsbJgP86C7VyntSr\\`", \\`"enabled\\`": true}"

```

### 🧪 SQL Query —  Check User data

```sql
# Show chat history of a specific user 

SELECT 
    id,
    role,
    message_text,
    mode,
    created_at
FROM public.chat_history
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;

# Show generated images of specifc user 

SELECT 
    id,
    prompt,
    mode,
    mime_type,
    created_
FROM public.generated_images
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;  
```

### 🧪 SQL Query — Insert Test Videos

```sql
INSERT INTO public.generated_videos (user_id, prompt, video_data, mime_type) VALUES
('YOUR_USER_ID', 'A happy puppy playing in a garden', 'AAAA', 'video/mp4');
```
