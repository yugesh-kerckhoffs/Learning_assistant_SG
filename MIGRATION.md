# Migration Guide: Sendelightgifts   AiBuddy

Complete guide to migrate this project from Lovable to **your own Supabase + Vercel + GitHub** setup.

---

## 1. Prerequisites

- Node.js 18+ installed
- A GitHub account
- A Vercel account (free tier works)
- A Supabase account (free tier works)
- Git installed locally
- Supabase CLI installed (`npm install -g supabase`)

---

## 2. Push Code to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

---

## 3. Set Up Your Supabase Project

### 3.1 Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note these values from **Settings → API**:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)
   - **Service Role Key** (starts with `eyJ...` — keep this SECRET)
   - **Project Ref** (the `abcdefgh` part of the URL)

### 3.2 Run Database Schema

1. Open the **SQL Editor** in your Supabase dashboard.
2. Copy the contents of `DB_STRUCTURE.txt` and run it in the SQL Editor.
3. This creates all tables, RLS policies, indexes, triggers, and sample data.

**Required tables include:**
- `profiles` — User profiles with school/teacher assignment
- `schools`, `teachers` — School system hierarchy
- `chat_history` — Chat message logs per user
- `generated_images`, `generated_videos` — AI-generated media
- `contact_messages` — Contact form submissions
- `safety_alerts` — Abuse detection alerts
- `user_subscriptions` — Pro plan subscription tracking
- `user_usage` — Monthly image/video generation counts
- `api_health_logs` — API health monitoring results
- `app_settings` — Global config (maintenance mode, etc.)

### 3.3 Configure Authentication

1. Go to **Authentication → URL Configuration** in Supabase.
2. Set the **Site URL** to your Vercel deployment URL.
3. Add redirect URLs:
   - `https://YOUR_DOMAIN.com/reset-password`
   - `http://localhost:5173/reset-password` (for local dev)

---

## 4. Update Code for Your Supabase Project

### 4.1 Update `src/lib/externalSupabase.ts`

```typescript
const EXTERNAL_SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

### 4.2 Create `.env` File

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_ANON_KEY
VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_REF
```

---

## 5. Deploy Edge Functions

### 5.1 Link Your Supabase Project

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### 5.2 Set Edge Function Secrets

```bash
# AI chat (Google Gemini API)
supabase secrets set GEMINI_API_KEY=your_gemini_api_key

# Admin login verification
supabase secrets set ADMIN_SECRET_KEY=your_admin_secret_key

# Contact form emails (Resend)
supabase secrets set RESEND_API_KEY=your_resend_api_key

# Stripe payments
supabase secrets set STRIPE_SECRET_KEY=your_stripe_secret_key

# External Supabase credentials
supabase secrets set EXTERNAL_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
supabase secrets set EXTERNAL_SUPABASE_ANON_KEY=YOUR_ANON_KEY
supabase secrets set EXTERNAL_SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

**Where to get these keys:**

| Secret | Source |
|---|---|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `ADMIN_SECRET_KEY` | Choose any strong password/key |
| `RESEND_API_KEY` | [Resend.com](https://resend.com) |
| `STRIPE_SECRET_KEY` | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |
| `EXTERNAL_SUPABASE_*` | Supabase Dashboard → Settings → API |

### 5.3 Deploy All Edge Functions

```bash
supabase functions deploy --no-verify-jwt
```

**Functions deployed:**
- `chat` — AI chat with image/video generation, quota enforcement, input sanitization
- `check-email-exists` — Forgot password email verification
- `check-subscription` — Subscription & usage quota checking
- `contact` — Contact form handler with input validation
- `create-checkout` — Stripe checkout session creation
- `healthz-monitor` — API health monitoring (runs every 10 hours)
- `speech-to-text` — Voice transcription via Gemini
- `toggle-maintenance` — Maintenance mode toggle (admin only)
- `verify-admin` — Admin key verification (timing-safe)
- `verify-payment` — Stripe payment verification & subscription activation
- `verify-session` — Session validation

---

## 6. Deploy Frontend to Vercel

### 6.1 Import from GitHub

1. Go to [vercel.com](https://vercel.com) → **New Project** → Import GitHub repo.
2. Framework Preset: **Vite**
3. Build Command: `npm run build`
4. Output Directory: `dist`

### 6.2 Set Environment Variables

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://YOUR_PROJECT_REF.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | `YOUR_PROJECT_REF` |

### 6.3 Deploy

Click **Deploy**. Vercel will build and deploy your app.

---

## 7. Post-Deployment Checklist

1. Update Supabase **Site URL** to your deployment URL
2. Add **Redirect URLs** for password reset

### Verify Everything Works

- [ ] Visit deployed URL
- [ ] Test sign up / sign in flow
- [ ] Test terms acceptance
- [ ] Test chat functionality (text + image + video generation)
- [ ] Test forgot password flow
- [ ] Test admin login
- [ ] Test social stories mode
- [ ] Test feelings helper
- [ ] Test contact form
- [ ] Test Stripe subscription flow
- [ ] Test usage quota limits (use SQL queries below)
- [ ] Verify all learning activities work
- [ ] Verify API health monitoring runs

---

## 8. Security Features

This project implements multiple security layers:

| Feature | Implementation |
|---|---|
| **Prompt Injection Prevention** | `inputSanitizer.ts` blocks 50+ injection patterns |
| **XSS Protection** | DOMPurify with strict allowlists, CSP meta tags |
| **Input Validation** | Server-side validation on all edge functions |
| **SQL Injection Prevention** | Parameterized queries via Supabase SDK |
| **Timing Attack Prevention** | Constant-time comparison for admin verification |
| **Child Safety Guardrails** | Anti-manipulation rules in AI system prompt |
| **Abuse Detection** | Dual-layer keyword + AI safety analysis |
| **Content Security Policy** | CSP headers in index.html |

---

## 9. Testing SQL Queries

### Simulate Max Usage (for quota testing)
```sql
INSERT INTO public.user_usage (user_id, month_year, images_generated, videos_generated)
VALUES ('YOUR_USER_ID', to_char(now(), 'YYYY-MM'), 20, 5)
ON CONFLICT (user_id, month_year) 
DO UPDATE SET images_generated = 20, videos_generated = 5;
```

### Reset Usage
```sql
DELETE FROM public.user_usage WHERE user_id = 'YOUR_USER_ID' AND month_year = to_char(now(), 'YYYY-MM');
```

### Upgrade User to Pro (1 Month, for testing)
```sql
UPDATE public.user_subscriptions SET is_active = false WHERE user_id = 'YOUR_USER_ID';
INSERT INTO public.user_subscriptions (user_id, plan, months_purchased, amount_paid, expires_at, is_active)
VALUES ('YOUR_USER_ID', 'pro', 1, 0, now() + interval '1 month', true);
UPDATE public.profiles SET plan = 'pro' WHERE id = 'YOUR_USER_ID';
```

### Downgrade to Free
```sql
UPDATE public.user_subscriptions SET is_active = false WHERE user_id = 'YOUR_USER_ID';
UPDATE public.profiles SET plan = 'free' WHERE id = 'YOUR_USER_ID';
```

---

## 10. Architecture Overview

```
┌──────────────────────────────────────────────────┐
│                  YOUR SETUP                       │
├──────────────────────────────────────────────────┤
│                                                   │
│  GitHub ──► Vercel (Frontend)                    │
│              ├── React + Vite + Tailwind          │
│              ├── DOMPurify XSS protection         │
│              ├── CSP headers                      │
│              └── Input validation                 │
│                                                   │
│  Supabase (Backend)                              │
│              ├── Authentication (email/password)  │
│              ├── Database (PostgreSQL)            │
│              ├── Edge Functions:                  │
│              │   ├── chat (Gemini + sanitizer)    │
│              │   ├── check-email-exists           │
│              │   ├── check-subscription           │
│              │   ├── contact                      │
│              │   ├── create-checkout              │
│              │   ├── healthz-monitor              │
│              │   ├── speech-to-text               │
│              │   ├── toggle-maintenance           │
│              │   ├── verify-admin (timing-safe)   │
│              │   ├── verify-payment               │
│              │   └── verify-session               │
│              └── Secrets (API keys)               │
│                                                   │
│  External APIs:                                   │
│              ├── Google Gemini (chat + images +   │
│              │   video + speech-to-text)           │
│              ├── Stripe (payments)                │
│              └── Resend (emails)                  │
│                                                   │
└──────────────────────────────────────────────────┘
```

---

## 11. Files Modified for Self-Hosting

| File | What Changed |
|---|---|
| `supabase/functions/chat/index.ts` | Uses GEMINI_API_KEY + input sanitization |
| `supabase/functions/chat/inputSanitizer.ts` | Prompt injection & XSS prevention module |
| `supabase/functions/chat/abuseDetection.ts` | Child safety abuse detection |
| `src/lib/api.ts` | Uses env vars for edge function URLs + quota checks |
| `src/lib/externalSupabase.ts` | **YOU MUST UPDATE** with your Supabase credentials |
| `src/lib/markdown.ts` | Secure markdown rendering with DOMPurify |
| `index.html` | Content Security Policy headers |
| `.env` | **YOU MUST CREATE** with your Supabase credentials |

---

## 12. Local Development

```bash
npm install
npm run dev
```

For edge functions local testing:

```bash
supabase start
# Or deploy to remote and test against it
```

---

## Troubleshooting

| Issue | Solution |
|---|---|
| **Blank page after deploy** | Check `vercel.json` rewrites |
| **Auth not working** | Verify Supabase URL and anon key in `.env` and `externalSupabase.ts` |
| **Database errors** | Ensure all SQL from `DB_STRUCTURE.txt` was executed |
| **Chat not working** | Check `GEMINI_API_KEY`: `supabase secrets list` |
| **Edge functions 500** | Check logs: `supabase functions logs chat` |
| **Payments not working** | Verify `STRIPE_SECRET_KEY` is set |
| **Videos not generating** | Check Pro subscription is active + quota not exceeded |
| **CORS errors** | Edge functions have CORS headers configured |
| **Admin login fails** | Check `ADMIN_SECRET_KEY` is set |
| **Prompt injection blocked** | Input sanitizer detected manipulation attempt |

---

## Security Notes

- **NEVER** expose `EXTERNAL_SUPABASE_SERVICE_ROLE_KEY` in frontend code
- **NEVER** commit `.env` to GitHub (it's already in `.gitignore`)
- All secrets are stored server-side in Supabase Edge Function environment
- The `externalSupabase.ts` file only contains the **anon/public** key (safe to commit)
- Edge functions use `--no-verify-jwt` — they validate auth internally where needed
- All user inputs are sanitized both client-side and server-side
- AI system prompt includes anti-manipulation guardrails
- Admin verification uses constant-time comparison to prevent timing attacks
