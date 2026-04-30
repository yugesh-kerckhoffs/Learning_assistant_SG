# 🧾 Stripe Migration Guide — Switching to a New Stripe Account

> Complete, step-by-step guide for migrating this app from the **current Stripe account** to a **new Stripe account** and getting everything fully integrated and in sync.

---

## 📌 Overview

This app uses Stripe for **one-time bulk Pro subscription purchases** (1–12 months). The integration lives in:

- Edge Function: `supabase/functions/create-checkout/index.ts`
- Edge Function: `supabase/functions/verify-payment/index.ts`
- Edge Function: `supabase/functions/check-subscription/index.ts`
- Secret: `STRIPE_SECRET_KEY` (stored in Lovable Cloud → Backend → Secrets)
- Account page UI: `src/pages/app/AccountPage.tsx`

Everything Stripe-related is driven by a **single secret key** + **Stripe Price IDs** referenced inside the edge functions. So a migration boils down to:

1. Recreate Products & Prices in the new Stripe account
2. Update the secret key
3. Update the Price IDs in code
4. Re-configure receipts & webhooks (if any)
5. Test in Test Mode → switch to Live Mode

---

## ✅ Prerequisites

Before you start:

- [ ] You have **owner/admin access** to **both** the old and the new Stripe accounts
- [ ] You have access to the **Lovable project** (this app)
- [ ] No active live customers are mid-checkout (do this during low-traffic time)
- [ ] You've informed any Pro users that **already-active subscriptions remain valid** (we store expiry in the database, independent of Stripe)

---

## 🪜 Step-by-Step Migration

### Step 1 — Prepare the new Stripe account

1. Go to <https://dashboard.stripe.com> and log into the **new Stripe account**.
2. In the top-right, confirm whether you are in **Test mode** or **Live mode** (toggle as needed).
3. Complete **business verification** if you want to accept live payments (required for Live mode).
4. Set up your **business profile**:
   - Public business name
   - Statement descriptor (appears on cards)
   - Support email & website

---

### Step 2 — Recreate the Pro Product & Prices

In the new Stripe account, create a **single Product** with **one Price per duration** the app sells (1 → 12 months).

1. Stripe Dashboard → **Product catalog → + Add product**
2. Fill in:
   - **Name**: `Pro Plan`
   - **Description**: `Unlimited chat, 100 images/month, 6 games (3 extra Pro), early access to new updates`
3. Under **Pricing**, add the prices used by this app. The current app uses **one-time** prices (no recurring). Create one Price for **each** of the 12 duration tiers, e.g.:

| Duration | Amount (USD) | Type     |
|----------|-------------|----------|
| 1 month  | $20.00      | One-time |
| 2 months | $40.00      | One-time |
| 3 months | $60.00      | One-time |
| 6 months | $120.00     | One-time |
| 12 months| $220.00     | One-time |

> 💡 You can add the in-between months (4, 5, 7, 8, 9, 10, 11) the same way, or generate them programmatically via the Stripe API if you have many.

4. After saving, **copy each Price ID** (starts with `price_...`). Keep them in a notes file mapped by month count, e.g.:

```
1m  -> price_1AbCD...
2m  -> price_2EfGH...
...
12m -> price_12IjKL...
```

---

### Step 3 — Get the new Stripe Secret Key

1. Stripe Dashboard → **Developers → API keys**
2. Copy the **Secret key**:
   - Test Mode → starts with `sk_test_...`
   - Live Mode → starts with `sk_live_...`
3. ⚠️ **Never commit this key to code**. We store it in Lovable Cloud as a secret.

---

### Step 4 — Update the Stripe key in Lovable Cloud

1. In Lovable, open the **Cloud / Backend** view.
2. Navigate to **Secrets**.
3. Find `STRIPE_SECRET_KEY`.
4. Click **Edit / Update value** and paste the **new secret key**.
5. Save.

> All edge functions automatically pick up the new secret on the next request — **no redeploy needed**.

---

### Step 5 — Update Price IDs in the Edge Functions

Open `supabase/functions/create-checkout/index.ts` and locate where Price IDs are referenced (look for `price_` strings or a `PRICE_MAP` object). Replace each old `price_...` with the new ones from **Step 2**.

Example mapping object (your file may differ slightly — keep the same structure):

```ts
const PRICE_MAP: Record<number, string> = {
  1:  "price_NEW_1m",
  2:  "price_NEW_2m",
  3:  "price_NEW_3m",
  4:  "price_NEW_4m",
  5:  "price_NEW_5m",
  6:  "price_NEW_6m",
  7:  "price_NEW_7m",
  8:  "price_NEW_8m",
  9:  "price_NEW_9m",
  10: "price_NEW_10m",
  11: "price_NEW_11m",
  12: "price_NEW_12m",
};
```

Save the file. The edge function redeploys automatically.

---

### Step 6 — Configure Customer Communications (Receipts & Invoices)

In the **new** Stripe account:

1. Stripe Dashboard → **Settings → Emails** (or **Customer emails**).
2. Enable:
   - ✅ **Successful payment receipts**
   - ✅ **Refund receipts**
   - ✅ **Invoice emails** (if you use invoices)
3. Customize the **email branding** (logo, colors, support email).

> ⚠️ **Test Mode does NOT send real emails.** Receipts in Test Mode are only viewable in the Stripe Dashboard. Emails go out only in **Live Mode**.

---

### Step 7 — (Optional) Re-create Webhooks

This app does **NOT** rely on webhooks today — it uses `verify-payment` polling after redirect. Skip this step unless you've added webhooks.

If you do use webhooks:

1. Stripe Dashboard → **Developers → Webhooks → + Add endpoint**
2. Endpoint URL: `https://<your-project-ref>.supabase.co/functions/v1/<your-webhook-function>`
3. Select the events you previously listened to (commonly: `checkout.session.completed`, `payment_intent.succeeded`).
4. Copy the **Webhook signing secret** (starts with `whsec_...`) and store it in Lovable Cloud secrets as `STRIPE_WEBHOOK_SECRET`.

---

### Step 8 — Sync existing Pro users (optional but recommended)

Subscription state lives in our own database (`user_subscriptions`, `profiles.plan`), not in Stripe. So **already-active Pro users keep their access automatically**, even after the Stripe account swap.

What you should still do:

- ✅ Keep the **old Stripe account open** for at least 60–90 days for refunds, disputes, and reporting.
- ✅ Issue any future refunds for **old purchases** from the **old account**.
- ✅ All **new purchases** go through the **new account** automatically.

If you want to migrate Stripe **customer records** (cards on file, invoice history) into the new account, request a **Stripe Data Migration** from Stripe Support — Stripe can transfer customers + payment methods between accounts under PCI rules. You **cannot** export raw card numbers yourself.

---

### Step 9 — Test the integration end-to-end

Use **Test Mode** first (`sk_test_...` + Test-mode Price IDs):

1. Open the app → `/app/account`
2. Click **Upgrade to Pro** → choose a duration
3. On the Stripe Checkout page, use test card `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP
4. Confirm:
   - ✅ Redirect back to the app succeeds
   - ✅ `verify-payment` marks the user as Pro
   - ✅ `profiles.plan` becomes `pro` in the database
   - ✅ `user_subscriptions` row is created with the correct expiry
   - ✅ Account page shows Pro plan + correct expiry
   - ✅ Pro-only games unlock in `/app/games`
   - ✅ A receipt appears in the Stripe Dashboard

Run through **all duration tiers** at least once (1m, 6m, 12m is a good sample).

---

### Step 10 — Go Live

1. Switch the new Stripe account to **Live Mode** in the Dashboard.
2. Recreate the **Live-mode Products & Prices** (Stripe keeps Test and Live separate). Copy the new Live Price IDs.
3. Update the Lovable secret `STRIPE_SECRET_KEY` to the **Live secret key** (`sk_live_...`).
4. Update the Price IDs in `create-checkout/index.ts` to the **Live Price IDs**.
5. Do **one real payment** with a real card (you can refund yourself afterward) to confirm Live works.

---

## 🚨 Rollback Plan

If something breaks after the switch:

1. In Lovable Cloud secrets, restore `STRIPE_SECRET_KEY` to the **old key**.
2. Revert the Price IDs in `create-checkout/index.ts` to the **old IDs** (use git history).
3. The old account starts processing payments again instantly.

Keep the old account active until you're 100% confident.

---

## 🧹 Decommissioning the Old Stripe Account

After ~90 days with zero issues:

1. Cancel any leftover test products/prices in the old account.
2. Download all reports for accounting (Payments, Payouts, Disputes).
3. You can leave the old account open (free) or close it via Stripe Support.

---

## 📋 Quick Checklist

- [ ] New Stripe account verified
- [ ] Pro Product + all Price tiers created
- [ ] New `STRIPE_SECRET_KEY` saved in Lovable Cloud secrets
- [ ] Price IDs updated in `create-checkout/index.ts`
- [ ] Customer email receipts enabled
- [ ] Test payment succeeded end-to-end (test mode)
- [ ] Live mode prices created + IDs swapped in
- [ ] One real Live payment confirmed
- [ ] Old account kept active 60–90 days for refunds

---

✅ **Migration complete.** Your app is now fully integrated with the new Stripe account.
