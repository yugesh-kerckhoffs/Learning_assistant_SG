# N8N migration

# How to Import & Configure

**Import:** In n8n, go to **Workflows → Import from file** and import each JSON individually.

## Credentials to Set Up (once, shared by all 3)

## **1. Supabase Postgres** — Add a Postgres credential named `"Supabase Postgres"`:

- Press Connect and select transaction pooler to see these info

| Field              | Value                                    |
| ------------------ | ---------------------------------------- |
| **Host**     | `aws-1-ap-south-1.pooler.supabase.com` |
| **Port**     | `6543`                                 |
| **Database** | `postgres`                             |
| **User**     | `postgres.wjrjhsllhcjefnittdlv`        |
| **Password** | `RpRfyhCHbV1FhBPw (Database password)` |
| **SSL**      | ON                                       |

Save and test. Should connect now.

## **2. Gmail OAuth2** — Add a Gmail credential named `"Gmail OAuth2"` using your Google account.

### Step 1 — Go to Google Cloud Console

1. Go to **console.cloud.google.com**
2. Click **"Select a project"** (top left) → **"New Project"**
3. Name it anything like `n8n-safechat` → click **"Create"**

---

### Step 2 — Enable Gmail API

1. In the left menu → **"APIs & Services"** → **"Library"**
2. Search **"Gmail API"** → click it → click **"Enable"**

---

### Step 3 — Configure OAuth Consent Screen

1. Left menu → **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** → click **"Create"**
3. Fill in:
   - **App name:** `n8n SafeChat`
   - **User support email:** your Gmail
   - **Developer contact email:** your Gmail
4. Click **"Save and Continue"**
5. On **Scopes** page → click **"Save and Continue"** (skip)
6. On **Test users** → click **"+ Add users"** → add your Gmail address → **"Save and Continue"**
7. Click **"Back to Dashboard"**

---

### Step 4 — Create OAuth Credentials

1. Left menu → **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. Application type → select **"Web application"**
4. Name: `n8n`
5. Under **"Authorized redirect URIs"** → click **"+ Add URI"**
6. Paste exactly what n8n showed you:
   `https://n8n.yugesh.me/rest/oauth2-credential/callback`
7. Click **"Create"**

---

### Step 5 — Copy Client ID and Secret

A popup appears with your **Client ID** and **Client Secret** — copy both.

---

### Step 6 — Back in n8n

Paste them into the fields:

- **Client ID** → paste
- **Client Secret** → paste
- Click **"Sign in with Google"** → it will now open Google login properly
- Approve permissions → done ✅

---
