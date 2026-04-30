# Stripe migration

### 1. Create a Stripe Account

- Go to [**stripe.com**](https://stripe.com/) and sign up
- Copy stripe password  ( Current : 2kARC72ifTQBc$M )
- Complete your business profile (name, address, bank details for pay-outs)

---

### 2. Get Your API Keys

- Go to **Stripe Dashboard → Developers → API Keys**
- You'll see two keys:
  - **Publishable key** (pk_test_... or pk_live_...) — used in frontend (safe to expose)
  - **Secret key** (sk_test_... or sk_live_...) — used in backend (NEVER expose)
- **Start with TEST keys** (toggle "Test mode" on the dashboard) to test without real money

---

### 3. No Product Setup Needed

1. **Create products on your new Stripe account:**

   - Go to **Stripe Dashboard → Products → + Add product**
   - **Product 1**:
     - Name:  AiBuddy Pro - Monthly
     - Description : Pro plan for Sendelightgifts  AiBuddy - per month access. 100 images/month, 5 videos/month, unlimited chat.
     - Price: $20.00 (one-off)
   - **Product 2**:
     - Name:  AiBuddy Pro - 12 Month Bundle
     - Description : Pro plan 12-month bundle - pay for 11 months, get 12. Best value!
     - Price: $220.00 (one-off)
2. **Copy the new Price IDs** (they look like price_1XXXX...) from each product's pricing section
3. **Update the edge function** — open supabase/functions/create-checkout/index.ts and replace lines 10-11:

   ```tsx
   const MONTHLY_PRICE_ID = "price_YOUR_NEW_MONTHLY_ID";
   const YEARLY_PRICE_ID = "price_YOUR_NEW_12MONTH_ID";
   ```
4. **Update the Stripe Secret Key** — in your Supabase secrets, update STRIPE_SECRET_KEY with the new account's secret key.

That's it — just 2 price IDs and 1 secret key to change each time.

### (or)

1. Add Products via lovable method

### Prompt

```sql
I plan to change the Stripe api key So, as me again the the stipe key i will provide the new key.
And next add the two products ( AiBuddy Pro - Monthly,  AiBuddy Pro - 12 Month Bundle) on my new stripe account 
```

---

### 4. Stripe Receipt

**Settings → Business → Customer emails → Successful payments**
