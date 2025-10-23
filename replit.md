# Web3 Jobs - Crypto/Web3 Job Board Platform

## Project Overview
A production-ready crypto/Web3 job board platform connecting blockchain talent with innovative companies. Built with full-stack TypeScript, featuring multi-role authentication, tiered job postings, Stripe payments, and comprehensive dashboards.

## Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui, Wouter (routing), TanStack Query
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect) - supports Google, GitHub, X, Apple, email/password
- **Payments**: Stripe with webhooks for credit provisioning
- **Fonts**: Inter (primary), JetBrains Mono (monospace)

## Key Features

### Multi-Role System
- **Guest**: Browse jobs and companies
- **Talent**: Create profiles, apply for jobs, save searches, track applications
- **Employer/Recruiter**: Post jobs, manage applications, view analytics
- **Admin**: Approve/moderate jobs and companies, manage platform

### Job Posting System
- **Three Tiers**:
  - Normal: Standard visibility in search results
  - Featured: Star badge, priority placement, homepage feature
  - Premium: Top priority, purple gradient border, newsletter/social promotion
- **Visibility Periods**: 7, 14, or 30 days
- **Status Workflow**: draft → pending → active → expired
- **Counters**: View count and application count tracking

### Search & Discovery
- Advanced filtering: keyword, category, company, location/remote, salary range, job type, experience level
- Sorting options: recent, relevant, salary
- Saved searches with email alerts (daily/weekly)
- Tiered promotion (Premium > Featured > Normal in all listings)

### Applications
- In-platform applications with cover letter and resume upload
- Optional external URL for company-hosted application pages
- Application tracking with status workflow
- Basic scoring system for employers

### Payment Integration
- Stripe checkout for job posting packages
- Webhook handling for automatic credit provisioning
- Credit ledger system for tracking employer balances
- Multiple pricing tiers with different visibility periods

### Dashboards
- **Talent**: Applications history, saved jobs, profile management
- **Employer**: Active jobs, view/application stats, credit balance, application inbox
- **Admin**: Platform stats, approval queue, user management

## Database Schema

### Core Tables
- `users`: User accounts with role-based access
- `companies`: Company profiles and information
- `company_members`: Links users to companies
- `jobs`: Job postings with tier, status, and visibility tracking
- `talent_profiles`: Talent CV and profile data
- `applications`: Job applications with status tracking
- `saved_jobs`: User-saved job bookmarks
- `saved_searches`: Saved search filters with alert preferences

### Monetization
- `plans`: Pricing tiers (tier, visibility days, price, credits)
- `payments`: Payment records linked to Stripe
- `credit_ledger`: Tracks employer credit balance and transactions

### Auth (Required)
- `sessions`: Session storage for Replit Auth
- `users`: Extended with Replit Auth fields (id, email, firstName, lastName, profileImageUrl, role)

## File Structure

```
client/
  ├── src/
  │   ├── components/
  │   │   ├── ui/          # shadcn/ui components
  │   │   ├── JobCard.tsx
  │   │   ├── CompanyCard.tsx
  │   │   ├── Navbar.tsx
  │   │   └── Footer.tsx
  │   ├── pages/
  │   │   ├── Landing.tsx
  │   │   ├── Jobs.tsx
  │   │   ├── JobDetail.tsx
  │   │   ├── Companies.tsx
  │   │   ├── CompanyDetail.tsx
  │   │   ├── Dashboard.tsx
  │   │   ├── PostJob.tsx
  │   │   ├── Pricing.tsx
  │   │   ├── Checkout.tsx
  │   │   ├── AdminPanel.tsx
  │   │   └── Settings.tsx
  │   ├── hooks/
  │   │   └── useAuth.ts
  │   ├── lib/
  │   │   ├── utils.ts
  │   │   ├── constants.ts
  │   │   └── authUtils.ts
  │   ├── App.tsx
  │   └── index.css
  ├── index.html
  └── ...

server/
  ├── db.ts            # Database connection
  ├── storage.ts       # Data access layer (IStorage interface)
  ├── routes.ts        # API routes
  ├── replitAuth.ts    # Authentication middleware
  └── ...

shared/
  └── schema.ts        # Drizzle schemas, types, and validations
```

## API Routes (To Be Implemented in Task 2)

### Authentication
- `GET /api/login` - Initiate OAuth login
- `GET /api/callback` - OAuth callback
- `GET /api/logout` - Sign out
- `GET /api/auth/user` - Get current user (protected)

### Jobs
- `GET /api/jobs` - List jobs with filters
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs` - Create job (employer only)
- `POST /api/jobs/:id/view` - Increment view count
- `POST /api/jobs/:id/apply` - Submit application (talent only)

### Companies
- `GET /api/companies` - List companies
- `GET /api/companies/:slug` - Get company details
- `GET /api/employer/companies` - Get employer's companies

### Dashboard
- `GET /api/dashboard/stats` - Get user dashboard stats
- `GET /api/applications` - Get user applications (talent)
- `GET /api/saved-jobs` - Get saved jobs (talent)
- `GET /api/employer/jobs` - Get employer's jobs

### Payments
- `POST /api/create-payment-intent` - Create Stripe payment intent
- `POST /api/stripe-webhook` - Handle Stripe webhooks
- `GET /api/plans` - Get available pricing plans

### Admin
- `GET /api/admin/jobs/pending` - Get jobs awaiting approval
- `GET /api/admin/companies/pending` - Get companies awaiting approval
- `POST /api/admin/jobs/:id/approve` - Approve job
- `POST /api/admin/jobs/:id/reject` - Reject job
- `POST /api/admin/companies/:id/approve` - Approve company
- `GET /api/admin/stats` - Get platform statistics

## Design System

Following `design_guidelines.md`:

### Colors
- **Primary**: Blue (#217 91% 60%) - Trust, tech-forward
- **Success**: Green (#142 76% 36%) - Active jobs, approvals
- **Warning**: Amber (#38 92% 50%) - Featured badge, pending states
- **Destructive**: Red (#0 84% 60%) - Expired, rejected
- **Accent**: Purple (#280 89% 66%) - Premium tier gradient

### Typography
- **Primary Font**: Inter (clean, highly readable)
- **Mono Font**: JetBrains Mono (code, wallet addresses)
- **Scale**: Display (2.5rem), H2 (2rem), H3 (1.5rem), Body (1rem), Small (0.875rem)

### Component Patterns
- Job cards with tier indicators (Premium: purple gradient border, Featured: star badge)
- Responsive layouts with mobile-first approach
- Consistent spacing using Tailwind units (4, 6, 8, 12, 16)
- Accessible focus states and ARIA labels throughout

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `STRIPE_SECRET_KEY` - Stripe API secret key (sk_...)
- `VITE_STRIPE_PUBLIC_KEY` - Stripe publishable key (pk_...)
- `REPL_ID` - Replit application ID (auto-provided)
- `REPLIT_DOMAINS` - Allowed domains for OAuth (auto-provided)

### Optional
- `ISSUER_URL` - Custom OIDC issuer (defaults to Replit)

## Development Commands

```bash
# Install dependencies
npm install

# Push database schema (creates/updates tables)
npm run db:push

# Start development server
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Current Status

**Task 1 Complete**: ✅ Schema & Frontend
- Complete database schema defined with all entities and relations
- Design system configured (Inter font, crypto/Web3 color palette)
- All React components built:
  - Landing page with hero, stats, features
  - Job listings with advanced filters
  - Job detail with application flow
  - Company directory and detail pages
  - Multi-role dashboard (Talent/Employer/Admin)
  - Job posting form
  - Pricing page with tier comparison
  - Stripe checkout integration
  - Admin approval panel
- Reusable components: JobCard, CompanyCard, Navbar, Footer
- Authentication hooks and utilities
- Professional, responsive design following crypto/Web3 aesthetic

**Next**: Task 2 - Backend Implementation
**Then**: Task 3 - Integration & Testing

## User Workflows

1. **Talent Journey**: Browse jobs → Save searches → Apply → Track applications → Get alerts
2. **Employer Journey**: Post job → Buy credits → Manage applications → View analytics
3. **Admin Journey**: Approve companies/jobs → Monitor platform → Moderate content

## Notes
- All frontend is built with stunning visual design following design_guidelines.md
- Dark mode is primary, light mode is secondary
- Components use shadcn/ui for consistency
- Stripe integration ready for one-time payments (job packages)
- Database schema supports all MVP features including saved searches and job alerts
- Role-based access control enforced at UI level (backend enforcement pending)
