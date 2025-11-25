# 🏗️ Renovation Job Costing Application

A comprehensive, AI-powered job costing and project management platform for renovation contractors and construction companies.

## ✨ Features

### 🤖 AI-Powered Cost Prediction
- **Machine Learning Models**: RandomForest, Linear Regression, and XGBoost models
- **Intelligent Estimates**: Get accurate cost predictions with 95% confidence intervals
- **Feature Explainability**: Understand which factors drive your costs
- **Continuous Learning**: Models improve with every project completed
- **Batch Predictions**: Analyze multiple projects simultaneously

### 📊 Comprehensive Cost Management
- **Multi-Version Budgeting**: Complete audit trail of all budget changes
- **Real-time Variance Tracking**: Instant comparison of estimates vs. actuals
- **Change Order Management**: Full workflow from request to approval
- **15+ Cost Categories**: Organized breakdown for all renovation types
- **CSV Import/Export**: Seamless data integration

### 📸 Advanced Photo Management
- **Visual Documentation**: Attach photos to scope items with annotations
- **Before/After Comparisons**: Interactive slider for showcasing transformations
- **Photo Annotations**: Add drawings, measurements, and notes
- **Bulk Upload**: Drag-and-drop multiple photos at once
- **Optimized Storage**: Automatic compression and CDN delivery

### 👥 Team Collaboration
- **Role-Based Access Control (RBAC)**:
  - **Owner**: Full system access
  - **Project Manager**: Manage jobs, approve change orders
  - **Foreman**: Update progress, add photos
  - **Viewer**: Read-only access
- **Job-Specific Roles**: Assign different roles per project
- **Real-time Updates**: Live collaboration across all devices

### 📱 Mobile PWA Application
- **Offline-First**: Works without internet connection
- **Field-Ready**: Perfect for on-site use
- **GPS Time Tracking**: Automatic location verification
- **Touch-Optimized**: Designed for mobile workflows
- **Installable**: Add to home screen like a native app

### 📧 Smart Notifications
- **Variance Alerts**: Get notified when costs exceed thresholds
- **Change Order Updates**: Real-time status changes
- **Daily/Weekly Summaries**: Automated project reports
- **Customizable Preferences**: Choose what and when you're notified

### 📅 Project Scheduling
- **Interactive Gantt Charts**: Drag-and-drop task scheduling
- **Critical Path Analysis**: Identify project bottlenecks
- **Resource Management**: Optimize crew and equipment allocation
- **Dependency Tracking**: Manage task relationships
- **Multiple Views**: Timeline, calendar, and resource views

### 🔒 Enterprise Security
- **Row-Level Security**: Multi-tenant data isolation
- **Encrypted Tokens**: Secure API authentication
- **Audit Trails**: Complete change logging
- **SOC 2 Ready**: Enterprise-grade compliance

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript 5
- **Styling**: TailwindCSS v4, Shadcn/ui components
- **Database**: Supabase (PostgreSQL 15) with RLS
- **AI/ML**: Python microservice with scikit-learn, XGBoost
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime subscriptions
- **Testing**: Vitest (unit), Playwright (E2E)
- **Deployment**: Vercel-ready

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+ (or use Supabase)
- Git

### Installation

1. **Clone the repository**
git clone https://github.com/pilotwaffle/Renovation-projection-job-costing
cd Renovation-projection-job-costing

2. **Install dependencies**
npm install

3. **Set up environment variables**
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

4. **Set up the database**
npx supabase db push

5. **Start the development server**
npm run dev

6. **Open your browser**
Navigate to http://localhost:3000

### AI Engine Setup (Optional)

For AI-powered predictions:

1. **Navigate to AI engine**
cd ai-prediction-engine

2. **Install Python dependencies**
pip install -r requirements.txt

3. **Start the AI service**
python run.py --port 5001

4. **Update environment variables**
# In your .env.local
NEXT_PUBLIC_AI_ENGINE_URL=http://localhost:5001

## 🎉 Version 2.0 - Major Release

- ✨ **AI-Powered Predictions** - ML models for accurate cost estimation
- 📱 **PWA Support** - Works offline, installable on mobile
- 👥 **Team Collaboration** - Multi-user with RBAC
- 📸 **Advanced Photos** - Annotations, before/after comparisons
- 📧 **Smart Notifications** - Customizable alerts and summaries
- 📅 **Project Scheduling** - Gantt charts, critical path analysis
- 🔒 **Enhanced Security** - Enterprise-grade access control

Made with ❤️ for renovation contractors and construction professionals
