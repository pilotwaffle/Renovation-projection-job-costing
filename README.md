# Renovation Job Costing

A professional web application for managing renovation project budgets, tracking costs, and analyzing job performance. Built for contractors and renovation professionals to streamline their job costing and budget management workflow.

## Features

### Core Functionality
- **Job Management** - Create and track renovation jobs with detailed budget information
- **Budget Tracking** - Monitor estimated vs. actual costs for materials and labor
- **Real-time Variance Analysis** - Automatic calculation of budget variance with visual alerts
- **Category Organization** - Organize budget items by categories (Framing, Electrical, Plumbing, etc.)
- **Scope Item Management** - Add, edit, and track individual line items with material costs and labor hours

### Advanced Features
- **Budget Templates** - Save common project budgets as reusable templates
- **Dashboard Analytics** - Visual charts and metrics for job performance
  - Top jobs by variance (Bar chart)
  - Budget breakdown by category (Pie chart)
  - Key metrics cards (Total jobs, Active jobs, Budget value, Avg variance)
- **CSV Import/Export** - Bulk import budget items and export for external analysis
- **PDF Export** - Generate professional PDF reports of job budgets
- **Variance Alerts** - Automatic threshold-based alerts (Warning at 10%, Critical at 20%)
- **Recent Activity Feed** - Track all changes and updates across jobs

### User Experience
- **Mobile Responsive** - Optimized for iPhone 17 Pro Max and all mobile devices
  - Hamburger navigation menu
  - Touch-friendly buttons (44x44px minimum)
  - Horizontal scrolling tables
  - Stacked mobile layouts
- **Authentication** - Secure user authentication via Supabase
- **Real-time Updates** - Live data synchronization across sessions
- **Intuitive Interface** - Clean, professional UI with Tailwind CSS

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Charts**: Recharts
- **CSV Processing**: PapaParse
- **PDF Generation**: jsPDF + jsPDF-AutoTable
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/pilotwaffle/Renovation-projection-job-costing.git
cd Renovation-projection-job-costing
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Run the database migrations to create tables:
   - `jobs` - Store renovation job information
   - `budget_versions` - Track budget versions per job
   - `scope_items` - Individual budget line items
   - `categories` - Budget item categories
   - `budget_templates` - Reusable budget templates
   - `template_items` - Items within templates

3. Enable Row Level Security (RLS) policies:
   - Users can only access their own jobs and templates
   - Authenticated users required for all operations

4. Get your Supabase URL and anon key from Project Settings > API

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

The app will auto-reload as you edit files.

### Build

Create a production build:

```bash
npm run build
npm start
```

## Project Structure

```
├── app/
│   ├── (auth)/              # Authentication pages (login, signup)
│   ├── (protected)/         # Protected routes requiring auth
│   │   ├── dashboard/       # Dashboard with analytics
│   │   ├── jobs/            # Job management pages
│   │   │   ├── [id]/        # Job detail and items
│   │   │   └── new/         # Create new job
│   │   └── templates/       # Template management
│   ├── layout.tsx           # Root layout with metadata
│   └── globals.css          # Global styles and mobile optimizations
├── components/              # Reusable React components
│   └── Navigation.tsx       # Responsive navigation with mobile menu
├── lib/
│   ├── supabase/            # Supabase client configuration
│   ├── types.ts             # TypeScript type definitions
│   └── utils.ts             # Utility functions
└── public/                  # Static assets
```

## Key Features Documentation

### Job Management
Create jobs with client information, address, and status tracking. Each job automatically gets a budget version for tracking scope items.

### Budget Templates
Save frequently used budgets as templates:
1. Navigate to any job's detail page
2. Click "Save as Template"
3. Templates can be applied to new jobs to pre-populate budget items

### CSV Import/Export
- **Import**: Upload CSV files with columns: Description, Category, Material Cost, Labor Hours, Labor Rate
- **Export**: Download complete job budgets as CSV for Excel/Google Sheets

### PDF Export
Generate professional PDF reports with:
- Job header information
- Complete budget breakdown by category
- Material and labor cost summaries
- Variance analysis
- Print-optimized styling

### Variance Alerts
Automatic alerts trigger based on budget variance:
- **Warning** (Yellow): 10-20% over budget
- **Critical** (Red): >20% over budget
- Displays prominently on job detail pages

## Deployment

The application is configured for automatic deployment on Vercel:

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push to main branch

Live URL: [renovation-projection-job-costing.vercel.app](https://renovation-projection-job-costing.vercel.app)

## Mobile Optimization

The application is fully optimized for mobile devices:
- Viewport meta tags for proper scaling
- 16px font size on inputs (prevents iOS zoom)
- 44x44px minimum touch targets (iOS standard)
- Responsive hamburger navigation menu
- Horizontal scrolling tables
- Stacked layouts on mobile (single column)
- Touch-friendly charts and graphs

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For issues and questions:
- Create an issue on GitHub
- Contact the development team

## Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced reporting and analytics
- [ ] Multi-user collaboration
- [ ] Photo attachments for scope items
- [ ] Invoice generation
- [ ] Client portal access
- [ ] Integration with accounting software

---

Built with Next.js 15 and Supabase
