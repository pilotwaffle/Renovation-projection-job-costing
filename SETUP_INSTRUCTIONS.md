# Supabase Setup Instructions for Renovation Job Costing

## Quick Setup Guide

### Step 1: Get Supabase Credentials

1. **Login to Supabase:**
   - Go to https://supabase.com/dashboard
   - Sign in with your account

2. **Find Your Project:**
   - Look for a project named "renovation-job-costing" or create a new one
   - Click on the project to open it

3. **Get API Credentials:**
   - In the left sidebar, click the **Settings** gear icon
   - Click on **API** in the settings menu
   - You'll see two important values:
     - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
     - **anon public** key (a long JWT token starting with `eyJ...`)
   - Keep this page open - you'll need these values next

### Step 2: Configure Local Environment

Create a file named `.env.local` in your project root with these values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Replace the values with YOUR actual credentials from Supabase!**

### Step 3: Set Up Database Tables

If you haven't already run the database migrations:

1. In Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into the SQL Editor and click **Run**
5. Repeat for `supabase/migrations/002_budget_templates.sql`

### Step 4: Configure Vercel Environment Variables

1. Go to https://vercel.com/pilotwaffles-projects/renovation-projection-job-costing
2. Click **Settings** tab
3. Click **Environment Variables** in the left menu
4. Add these two variables:
   - Variable name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: Your Supabase Project URL
   - Click **Add**
   
   - Variable name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
   - Value: Your Supabase anon key
   - Click **Add**

5. **Important:** After adding variables, go to **Deployments** tab
6. Click the three dots (...) on the latest deployment
7. Click **Redeploy** to apply the new environment variables

### Step 5: Test Local Setup

```bash
npm run dev
```

Then visit http://localhost:3000 and try to sign up with a test account.

### Step 6: Test Vercel Deployment

After redeploying Vercel:
1. Visit https://renovation-projection-job-costing.vercel.app
2. Click Sign Up
3. Create an account with your credentials
4. You should be redirected to the dashboard

---

## Current Status

- ✅ Local server running on http://localhost:3009
- ✅ UI components working with mock data
- ❌ Supabase environment variables NOT configured locally
- ❌ Supabase environment variables NOT configured on Vercel
- ❌ Authentication failing (due to missing env vars)

## What's Working

The dashboard UI is fully functional with:
- 4 stat overview cards
- Variance bar chart
- Budget category pie chart  
- Recent activity timeline
- Jobs table with all details
- Clean, modern design

## What Needs Setup

1. Supabase credentials (`.env.local` file)
2. Vercel environment variables
3. Database migrations (if not already run)

---

Need help? Check `SUPABASE_SETUP.md` for detailed step-by-step instructions.
