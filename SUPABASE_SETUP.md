# Supabase Setup Guide

## Step 1: Create Supabase Account & Project

### 1.1 Sign Up for Supabase
1. Go to https://supabase.com
2. Click **"Start your project"** or **"Sign In"**
3. Sign up with GitHub, Google, or Email

### 1.2 Create a New Project
1. Once logged in, click **"New Project"**
2. Fill in the project details:
   - **Name:** `renovation-job-costing` (or any name you prefer)
   - **Database Password:** Create a strong password and **SAVE IT** (you'll need it later)
   - **Region:** Choose closest to your location (e.g., US East, US West, Europe)
   - **Pricing Plan:** Select **"Free"** (sufficient for development and small production)
3. Click **"Create new project"**
4. Wait 2-3 minutes for the project to be provisioned

---

## Step 2: Get Your API Credentials

Once your project is ready:

1. In the Supabase dashboard, go to **"Project Settings"** (gear icon in left sidebar)
2. Click on **"API"** in the settings menu
3. You'll see two important values:

   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public key** (looks like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

4. **Keep this page open** - you'll need these values in the next step

---

## Step 3: Configure Environment Variables

### 3.1 Create `.env.local` File

In your project root directory:

```bash
# From your project root
touch .env.local
```

### 3.2 Add Your Credentials

Open `.env.local` and add (replace with YOUR values from Supabase):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxx
```

**Important:**
- Replace `xxxxxxxxxxxxx.supabase.co` with YOUR Project URL
- Replace the `eyJh...` with YOUR anon public key
- Do NOT use quotes around the values
- Do NOT commit this file to git (it's already in `.gitignore`)

---

## Step 4: Run Database Migrations

### 4.1 Run Initial Schema Migration

1. **Open Supabase Dashboard**
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New query"**
4. **Copy the entire contents** of `supabase/migrations/001_initial_schema.sql` from your project
5. **Paste into the SQL Editor**
6. Click **"Run"** (or press Ctrl+Enter / Cmd+Enter)
7. You should see: **"Success. No rows returned"**

### 4.2 Run Budget Templates Migration

1. Still in SQL Editor, click **"New query"** again
2. **Copy the entire contents** of `supabase/migrations/002_budget_templates.sql`
3. **Paste into the SQL Editor**
4. Click **"Run"**
5. You should see: **"Success. No rows returned"**

### 4.3 Verify Tables Were Created

1. In Supabase dashboard, click **"Table Editor"** in the left sidebar
2. You should now see these tables:
   - ✅ `jobs`
   - ✅ `budget_versions`
   - ✅ `scope_items`
   - ✅ `categories`
   - ✅ `budget_templates` (new)
   - ✅ `template_items` (new)

---

## Step 5: Enable Email Authentication

1. In Supabase dashboard, go to **"Authentication"** in the left sidebar
2. Click **"Providers"**
3. Make sure **"Email"** is enabled (it should be by default)
4. Scroll down to **"Email Auth"** settings:
   - ✅ Enable email confirmations: **OFF** (for development)
   - You can enable this later for production

---

## Step 6: Test the Connection

### 6.1 Start the Development Server

```bash
npm run dev
```

### 6.2 Test Signup

1. Open http://localhost:3000
2. Click **"Sign Up"** (or go directly to http://localhost:3000/signup)
3. Create a test account:
   - Email: `test@example.com`
   - Password: `testpassword123`
4. Click **"Sign Up"**

If successful:
- ✅ You should be redirected to `/dashboard`
- ✅ You should see "Welcome to Job Costing"

### 6.3 Verify User in Supabase

1. Go back to Supabase dashboard
2. Click **"Authentication"** > **"Users"**
3. You should see your test user listed

---

## Step 7: Verify Everything Works

### Create a Test Job

1. In the app, click **"Create First Job"** or go to `/jobs/new`
2. Fill in:
   - Job Name: "Test Kitchen"
   - Client: "John Doe"
   - Address: "123 Main St"
3. Click **"Create Job"**
4. You should be redirected to the job detail page

### Verify in Supabase Database

1. Go to Supabase dashboard > **"Table Editor"**
2. Click on **"jobs"** table
3. You should see your "Test Kitchen" job

---

## Troubleshooting

### Problem: "Invalid API key" or "Failed to fetch"

**Solution:**
- Check that `.env.local` has the correct `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Restart your dev server: Stop (Ctrl+C) and run `npm run dev` again
- Verify no extra spaces or quotes in `.env.local`

### Problem: "relation 'jobs' does not exist"

**Solution:**
- You didn't run the migrations. Go back to Step 4 and run both migration files in SQL Editor

### Problem: "row-level security policy violation"

**Solution:**
- Make sure you're signed in (authenticated)
- Check that the migrations created the RLS policies correctly
- In Supabase, go to Table Editor > jobs > click settings icon > verify RLS is enabled

### Problem: Tables don't show up in Table Editor

**Solution:**
- Refresh the Supabase dashboard page
- Make sure the SQL migrations ran without errors
- Check the query results in SQL Editor for error messages

---

## Quick Reference

### Your Supabase Project Info

After setup, you'll have:
- **Project URL:** `https://xxxxx.supabase.co` (in `.env.local`)
- **Anon Key:** `eyJh...` (in `.env.local`)
- **Database Password:** (you created this during project setup)

### Important Links

- **Supabase Dashboard:** https://supabase.com/dashboard
- **Your Project:** https://supabase.com/dashboard/project/YOUR_PROJECT_ID
- **Table Editor:** https://supabase.com/dashboard/project/YOUR_PROJECT_ID/editor
- **SQL Editor:** https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
- **Authentication:** https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/users

---

## Next Steps

Once you've completed all steps above and verified everything works:

1. ✅ Create a test account
2. ✅ Create a test job with scope items
3. ✅ Test saving a budget as a template
4. ✅ Test creating a new job from a template
5. ✅ Review `FEATURE_1_TEMPLATES_TESTING.md` for comprehensive testing

**Then let me know you're ready for Feature 2: Dashboard with Analytics!**

---

## Security Notes

### For Development (Current)
- `.env.local` is in `.gitignore` (good!)
- Email confirmations are disabled (convenient for testing)
- RLS policies are enabled (secure)

### For Production (Later)
- Use Vercel environment variables (not `.env.local`)
- Enable email confirmations
- Use custom SMTP for emails (optional)
- Enable 2FA for Supabase dashboard access

---

**Need Help?**

If you encounter any issues during setup:
1. Check the error message carefully
2. Verify all steps were completed
3. Check browser console for errors (F12)
4. Let me know the specific error and I'll help troubleshoot!
