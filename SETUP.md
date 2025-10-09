# Setup Instructions

## Step 1: Install Dependencies

Due to potential npm issues on Windows, manually add these packages to your `package.json` if they're missing:

```bash
npm install @supabase/ssr @supabase/supabase-js zod react-hook-form @hookform/resolvers @tanstack/react-query recharts date-fns
```

## Step 2: Configure Supabase

1. Create a Supabase project at https://supabase.com
2. Copy `.env.local.example` to `.env.local`
3. Add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

## Step 3: Run Database Migrations

1. Go to your Supabase project dashboard
2. Open SQL Editor
3. Copy the entire content from `supabase/migrations/001_initial_schema.sql`
4. Paste and run it
5. Verify tables were created in the Table Editor

## Step 4: Install Shadcn/ui

```bash
npx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Zinc
- CSS variables: Yes

## Step 5: Start Development

```bash
npm run dev
```

Open http://localhost:3000

## Troubleshooting

### npm install hangs or times out
- Try deleting `node_modules` and `package-lock.json`
- Run `npm cache clean --force`
- Try `npm install --legacy-peer-deps`

### Supabase connection errors
- Verify environment variables are correct
- Check Supabase project is not paused
- Ensure API keys have correct permissions

### Build errors
- Ensure all dependencies are installed
- Check TypeScript version is 5.x
- Verify Next.js is version 15.x
