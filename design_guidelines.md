# Design Guidelines: Crypto/Web3 Job Board Platform

## Design Approach

**Selected Framework**: Hybrid approach combining **shadcn/ui + Radix design patterns** with **crypto/Web3 visual language**

**Rationale**: Job boards are utility-focused, requiring scannable listings, efficient filtering, and data-dense dashboards. However, crypto/Web3 audiences expect modern, tech-forward aesthetics. This hybrid maintains usability while meeting market visual expectations.

**Key Design Principles**:
- Clarity over decoration: Information hierarchy is paramount
- Progressive disclosure: Complex features revealed contextually
- Role-aware interfaces: Clear visual separation between Talent/Employer/Admin views
- Trust signals: Professional presentation for payment and application flows

---

## Core Design Elements

### A. Color Palette

**Dark Mode (Primary)**:
- Background: 222 47% 11% (deep slate)
- Surface: 224 71% 16% (elevated cards)
- Border: 217 33% 24% (subtle separation)
- Text Primary: 213 31% 91%
- Text Secondary: 215 20% 65%

**Light Mode (Secondary)**:
- Background: 0 0% 100%
- Surface: 240 10% 98%
- Border: 214 32% 91%
- Text Primary: 222 47% 11%
- Text Secondary: 215 16% 47%

**Brand Colors**:
- Primary: 217 91% 60% (vibrant blue - trust, tech)
- Primary Hover: 217 91% 54%
- Success: 142 76% 36% (green for active jobs, applications)
- Warning: 38 92% 50% (amber for pending states)
- Destructive: 0 84% 60% (red for expired, rejections)

**Accent (Minimal Use)**:
- Accent: 280 89% 66% (purple gradient hints for Premium tier only)

**Tier Visual Indicators**:
- Premium: Subtle purple gradient border (280 89% 66% to 217 91% 60%)
- Featured: Gold/amber badge (38 92% 50%)
- Normal: Standard border color

### B. Typography

**Font Stack**:
- Primary: 'Inter', system-ui, sans-serif (clean, highly readable)
- Mono: 'JetBrains Mono', monospace (for code, wallet addresses)

**Type Scale**:
- Display (H1): 2.5rem / 3rem, font-semibold (hero, dashboard titles)
- H2: 2rem / 2.5rem, font-semibold (section headers)
- H3: 1.5rem / 2rem, font-semibold (card titles, job titles)
- H4: 1.25rem / 1.75rem, font-medium (subsections)
- Body: 1rem / 1.5rem, font-normal (listings, descriptions)
- Small: 0.875rem / 1.25rem, font-normal (metadata, timestamps)
- Caption: 0.75rem / 1rem, font-normal (badges, counts)

### C. Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16** consistently
- Component padding: p-4 to p-6
- Section spacing: py-12 to py-16
- Card spacing: p-6 to p-8
- Input padding: px-4 py-2

**Container Strategy**:
- Max width: max-w-7xl (1280px) for main content
- Sidebar width: w-64 to w-80 (filters, navigation)
- Narrow content: max-w-2xl (forms, single job view)
- Full bleed: Job search results, company directory

**Grid Patterns**:
- Job listings: Single column stack (scannable, mobile-first)
- Company directory: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Dashboard stats: grid-cols-1 md:grid-cols-3 lg:grid-cols-4
- Filters: Sticky sidebar on lg+, drawer on mobile

### D. Component Library

**Navigation**:
- Top navbar: Fixed, backdrop-blur, with role-based menu items
- Logo left, search center (on /jobs), auth/profile right
- Mobile: Hamburger menu with slide-out drawer

**Job Cards**:
- Border card with subtle shadow on hover
- Company logo (48x48 rounded)
- Job title (H3), company name (link), location/remote badge
- Metadata row: Type, Level, Salary (when available), Posted time
- Premium: Purple gradient left border (border-l-4)
- Featured: Amber star icon top-right
- Footer: View count, apply count, Save button

**Forms & Inputs**:
- Rounded corners (rounded-md)
- Focus ring: ring-2 ring-primary
- Error states: border-destructive with error text below
- File upload: Drag-drop zone with clear state feedback
- Multi-select: Checkbox groups for filters, tag input for skills

**Buttons**:
- Primary: Solid background, high contrast text
- Secondary: Outline with hover fill
- Ghost: Transparent, hover background
- Destructive: Red variant for delete/reject actions
- Icon buttons: 40x40 minimum touch target

**Data Tables** (Applications, Admin):
- Sticky header row
- Zebra striping (subtle) for readability
- Sortable columns with clear indicators
- Row actions: Dropdown menu on hover/click
- Pagination: Bottom, with page size selector

**Dashboards**:
- Stat cards: 4-column grid on desktop
- Charts: Lightweight (Chart.js or Recharts), consistent color palette
- Quick actions: Prominent CTAs (Post Job, Edit Profile)
- Activity feed: Timeline style for applications/notifications

**Modals & Overlays**:
- Dialog: Centered, max-w-lg, backdrop blur
- Drawer: Slide from right for filters, forms
- Toast notifications: Top-right, auto-dismiss, action button when needed

**Badges & Tags**:
- Pill shape (rounded-full), compact padding (px-2.5 py-0.5)
- Color-coded by meaning (Remote: blue, Full-time: green, Senior: purple)
- Stack horizontally with gap-2

**Empty States**:
- Centered illustration or icon (lucide-react)
- Clear message + helpful CTA
- Examples: "No saved jobs yet - Start exploring", "Post your first job"

### E. Animations

**Minimal, Purposeful Motion**:
- Page transitions: None (instant navigation)
- Card hover: Scale (1.02) + shadow increase (duration-200)
- Button hover: Background color shift (duration-150)
- Dropdown/drawer: Slide animation (duration-300)
- Toast enter/exit: Slide + fade (duration-300)
- Loading states: Spinner or skeleton (no heavy animations)

**Prohibited**: Parallax, scroll-triggered reveals, decorative particles

---

## Page-Specific Layouts

### Homepage (Marketing/Landing)
- Hero: Full-width gradient background (subtle, dark to darker), centered search bar, "Find your Web3 role" headline, job count stat
- Featured jobs: 3-card horizontal scroll or grid
- Companies hiring: Logo grid with hover effects
- Stats: 3-column (Jobs Posted, Companies, Developers)
- Footer: Newsletter signup, links, social

### Job Search/Listings (/jobs)
- Left sidebar (lg+): Filters (collapsible sections), "Clear all" button
- Main area: Search bar top, sort dropdown, results count
- Job cards: Stacked list, infinite scroll or pagination
- Right sidebar (optional): Saved searches, Recent views

### Single Job View (/jobs/[id])
- Two-column: Main (66%), Sidebar (33%)
- Main: Job description (markdown support), requirements, responsibilities
- Sidebar: Company card, Apply button (primary, sticky on scroll), Share, Save, Report
- Related jobs: Below main content

### Company Page (/companies/[slug])
- Hero: Company cover image, logo overlay, "Hiring" badge if active jobs
- Tabs: About, Open Positions (count), Team
- Open positions: Filtered job cards for this company

### Talent Dashboard (/dashboard/talent)
- Stats: Applications sent, Saved jobs, Profile views
- Quick actions: Edit profile, Export CV
- Applications table: Job title, Company, Status (badge), Applied date, Actions
- Recommended jobs: Card carousel

### Employer Dashboard (/dashboard/employer)
- Stats: Active jobs, Total views, Applications received, Credits remaining
- Quick actions: Post job, Buy credits
- Jobs table: Title, Status, Tier, Views, Applications, Actions (Edit, Promote, Close)
- Applications inbox: Filterable table with scoring column

### Admin Panel (/admin)
- Sidebar navigation: Dashboard, Jobs (pending approval), Companies, Users, Pricing, Analytics
- Approval queue: Table with Preview, Approve, Reject actions
- Analytics: Charts for user growth, job postings, revenue

---

## Images

**Hero Section (Homepage)**:
- Large background image: Abstract tech/blockchain visual (dark, subtle) OR gradient overlay only
- Avoid literal imagery (people at desks) - prefer abstract, modern

**Company Logos**:
- Throughout platform (job cards, company directory, sidebar)
- 48x48 on cards, 96x96 on company pages
- Fallback: Colored circle with company initial

**Placeholder Images**:
- Profile avatars: Gradient circles with initials
- Empty states: Minimal line illustrations (lucide icons scaled large)

**No Heavy Imagery**: This is a data-driven platform - images serve functional purposes (logos, avatars), not decoration.

---

## Accessibility & Dark Mode

- **Dark mode is primary**: Optimize contrast for dark backgrounds
- Form inputs: Visible borders in dark mode (not just focus state)
- All text meets WCAG AA contrast (4.5:1 minimum)
- Keyboard navigation: Clear focus indicators throughout
- Screen readers: Proper ARIA labels on interactive elements

---

**Output Mandate**: Create a professional, efficient job board that feels modern and trustworthy, balancing crypto/Web3 aesthetic expectations with information-dense usability. Prioritize scannable layouts, clear CTAs, and role-appropriate dashboards.