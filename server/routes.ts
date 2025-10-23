import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth, requireRole, setupReplitAuth } from "./replitAuth";
import { insertJobSchema, insertCompanySchema, insertApplicationSchema } from "@shared/schema";
import Stripe from "stripe";
import "./types";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe key: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth
  await setupReplitAuth(app);

  // ==================== Jobs ====================

  // List jobs with filters
  app.get('/api/jobs', async (req: Request, res: Response) => {
    try {
      const {
        search,
        category,
        type,
        level,
        remote,
        companyId,
      } = req.query;

      const filters: any = {
        status: 'active', // Only show active jobs to public
      };

      if (search) filters.search = search as string;
      if (category && category !== 'all') filters.category = category as string;
      if (type && type !== 'all') filters.jobType = type as string;
      if (level && level !== 'all') filters.experienceLevel = level as string;
      if (remote === 'true') filters.isRemote = true;
      if (companyId) filters.companyId = companyId as string;

      const jobsList = await storage.listJobs(filters);

      // Enrich with company data
      const jobsWithCompanies = await Promise.all(
        jobsList.map(async (job) => {
          const company = await storage.getCompany(job.companyId);
          return { ...job, company };
        })
      );

      res.json(jobsWithCompanies);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single job
  app.get('/api/jobs/:id', async (req: Request, res: Response) => {
    try {
      const job = await storage.getJob(req.params.id);

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const company = await storage.getCompany(job.companyId);

      res.json({ ...job, company });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create job (employer only)
  app.post('/api/jobs', requireRole('employer', 'recruiter'), async (req: Request, res: Response) => {
    try {
      const validatedData = insertJobSchema.parse(req.body);

      // Check ownership: user must be a member of the company or admin
      const isMember = await storage.isCompanyMember(req.session.userId!, validatedData.companyId);
      const user = await storage.getUser(req.session.userId!);
      
      if (!isMember && user?.role !== 'admin') {
        return res.status(403).json({ error: 'You do not have permission to post jobs for this company' });
      }

      const job = await storage.createJob({
        ...validatedData,
        status: 'pending', // Requires admin approval
      });

      res.status(201).json(job);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Increment view count
  app.post('/api/jobs/:id/view', async (req: Request, res: Response) => {
    try {
      await storage.incrementJobView(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update job (employer only)
  app.put('/api/jobs/:id', requireRole('employer', 'recruiter'), async (req: Request, res: Response) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // Check ownership: user must be a member of the company that owns this job
      const isMember = await storage.isCompanyMember(req.session.userId!, job.companyId);
      const user = await storage.getUser(req.session.userId!);
      
      if (!isMember && user?.role !== 'admin') {
        return res.status(403).json({ error: 'You do not have permission to update this job' });
      }

      // Only allow employers to update specific fields (not admin-controlled fields)
      const employerUpdateSchema = insertJobSchema
        .partial()
        .omit({ companyId: true, status: true, tier: true, publishedAt: true, expiresAt: true });
      
      const validatedData = employerUpdateSchema.parse(req.body);

      const updatedJob = await storage.updateJob(req.params.id, validatedData);
      
      res.json(updatedJob);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete job (employer only)
  app.delete('/api/jobs/:id', requireRole('employer', 'recruiter', 'admin'), async (req: Request, res: Response) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // Check ownership: user must be a member of the company or admin
      const isMember = await storage.isCompanyMember(req.session.userId!, job.companyId);
      const user = await storage.getUser(req.session.userId!);
      
      if (!isMember && user?.role !== 'admin') {
        return res.status(403).json({ error: 'You do not have permission to delete this job' });
      }
      
      // Mark as expired instead of actual delete to preserve data integrity
      await storage.expireJob(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Apply to job (talent only)
  app.post('/api/jobs/:id/apply', requireAuth, async (req: Request, res: Response) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // Check if already applied
      const existingApplications = await storage.listApplications({
        userId: req.session.userId!,
        jobId: req.params.id,
      });

      if (existingApplications.length > 0) {
        return res.status(400).json({ error: 'You have already applied to this job' });
      }

      const application = await storage.createApplication({
        userId: req.session.userId!,
        jobId: req.params.id,
        coverLetter: req.body.coverLetter,
        resumeUrl: req.body.resumeUrl,
        status: 'submitted',
      });

      // Increment application count
      await storage.incrementJobApply(req.params.id);

      res.status(201).json(application);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ==================== Companies ====================

  // List companies
  app.get('/api/companies', async (req: Request, res: Response) => {
    try {
      const { search } = req.query;

      const companiesList = await storage.listCompanies({
        search: search as string | undefined,
        isApproved: true, // Only show approved companies to public
      });

      res.json(companiesList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single company
  app.get('/api/companies/:slug', async (req: Request, res: Response) => {
    try {
      const company = await storage.getCompanyBySlug(req.params.slug);

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // Get company's active jobs
      const jobsList = await storage.listJobs({
        companyId: company.id,
        status: 'active',
      });

      res.json({ ...company, jobs: jobsList });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create company (employer only)
  app.post('/api/companies', requireRole('employer', 'recruiter'), async (req: Request, res: Response) => {
    try {
      const validatedData = insertCompanySchema.parse(req.body);

      const company = await storage.createCompany({
        ...validatedData,
        isApproved: false, // Requires admin approval
        isHiring: true,
      });

      res.status(201).json(company);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update company (employer only)
  app.put('/api/companies/:id', requireRole('employer', 'recruiter'), async (req: Request, res: Response) => {
    try {
      // Check ownership: user must be a member of the company or admin
      const isMember = await storage.isCompanyMember(req.session.userId!, req.params.id);
      const user = await storage.getUser(req.session.userId!);
      
      if (!isMember && user?.role !== 'admin') {
        return res.status(403).json({ error: 'You do not have permission to update this company' });
      }

      // Only allow employers to update specific fields (not admin-controlled fields)
      const employerUpdateSchema = insertCompanySchema
        .partial()
        .omit({ isApproved: true });
      
      const validatedData = employerUpdateSchema.parse(req.body);
      const company = await storage.updateCompany(req.params.id, validatedData);
      
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }
      
      res.json(company);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get employer's companies
  app.get('/api/employer/companies', requireRole('employer', 'recruiter'), async (req: Request, res: Response) => {
    try {
      // Get company IDs user is a member of
      const userCompanyIds = await storage.getUserCompanyIds(req.session.userId!);
      
      // Get full company data for user's companies
      const companiesList = await storage.listCompanies({ isApproved: true });
      const userCompanies = companiesList.filter(c => userCompanyIds.includes(c.id));
      
      res.json(userCompanies);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get employer's jobs with applications
  app.get('/api/employer/jobs', requireRole('employer', 'recruiter'), async (req: Request, res: Response) => {
    try {
      // Get company IDs user is a member of
      const userCompanyIds = await storage.getUserCompanyIds(req.session.userId!);
      
      if (userCompanyIds.length === 0) {
        return res.json([]);
      }
      
      // Get all jobs from user's companies
      const jobsList = await storage.listJobs({});
      const userJobs = jobsList.filter(job => userCompanyIds.includes(job.companyId));
      
      // Enrich with company and application data
      const jobsWithData = await Promise.all(
        userJobs.map(async (job) => {
          const company = await storage.getCompany(job.companyId);
          const applicationsList = await storage.listApplications({ jobId: job.id });
          return { ...job, company, applicationsCount: applicationsList.length, applications: applicationsList };
        })
      );
      
      res.json(jobsWithData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== Applications ====================

  // Get user's applications (talent)
  app.get('/api/applications', requireAuth, async (req: Request, res: Response) => {
    try {
      const applicationsList = await storage.listApplications({
        userId: req.session.userId!,
      });

      // Enrich with job and company data
      const applicationsWithJobs = await Promise.all(
        applicationsList.map(async (application) => {
          const job = await storage.getJob(application.jobId);
          if (job) {
            const company = await storage.getCompany(job.companyId);
            return { ...application, job: { ...job, company } };
          }
          return application;
        })
      );

      res.json(applicationsWithJobs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update application status (employer/admin only)
  app.put('/api/applications/:id', requireRole('employer', 'recruiter', 'admin'), async (req: Request, res: Response) => {
    try {
      // Validate input
      const updateSchema = z.object({
        status: z.enum(['submitted', 'reviewing', 'shortlisted', 'interview', 'offered', 'rejected', 'withdrawn']).optional(),
        score: z.number().min(0).max(100).optional(),
        notes: z.string().optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      
      // Get application and verify ownership
      const existingApplication = await storage.getApplication(req.params.id);
      if (!existingApplication) {
        return res.status(404).json({ error: 'Application not found' });
      }
      
      // Get the job to check company ownership
      const job = await storage.getJob(existingApplication.jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      
      // Check that employer is a member of the company or is admin
      const isMember = await storage.isCompanyMember(req.session.userId!, job.companyId);
      const user = await storage.getUser(req.session.userId!);
      
      if (!isMember && user?.role !== 'admin') {
        return res.status(403).json({ error: 'You do not have permission to update this application' });
      }
      
      const application = await storage.updateApplication(req.params.id, validatedData);
      
      res.json(application);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ==================== Saved Jobs ====================

  // Get saved jobs
  app.get('/api/saved-jobs', requireAuth, async (req: Request, res: Response) => {
    try {
      const savedJobsList = await storage.getSavedJobs(req.session.userId!);

      // Enrich with job and company data
      const savedWithJobs = await Promise.all(
        savedJobsList.map(async (saved) => {
          const job = await storage.getJob(saved.jobId);
          if (job) {
            const company = await storage.getCompany(job.companyId);
            return { ...saved, job: { ...job, company } };
          }
          return saved;
        })
      );

      res.json(savedWithJobs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Save a job
  app.post('/api/saved-jobs', requireAuth, async (req: Request, res: Response) => {
    try {
      const savedJob = await storage.createSavedJob({
        userId: req.session.userId!,
        jobId: req.body.jobId,
      });

      res.status(201).json(savedJob);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete saved job
  app.delete('/api/saved-jobs/:jobId', requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteSavedJob(req.session.userId!, req.params.jobId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== Saved Searches ====================

  // Get saved searches
  app.get('/api/saved-searches', requireAuth, async (req: Request, res: Response) => {
    try {
      const savedSearches = await storage.getSavedSearches(req.session.userId!);
      res.json(savedSearches);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create saved search
  app.post('/api/saved-searches', requireAuth, async (req: Request, res: Response) => {
    try {
      // Validate input
      const savedSearchSchema = z.object({
        name: z.string().min(1).max(255),
        filters: z.record(z.any()),
        alertFrequency: z.enum(['daily', 'weekly']).optional(),
      });
      
      const validatedData = savedSearchSchema.parse(req.body);
      
      const savedSearch = await storage.createSavedSearch({
        userId: req.session.userId!,
        name: validatedData.name,
        filters: JSON.stringify(validatedData.filters),
        alertFrequency: validatedData.alertFrequency,
      });

      res.status(201).json(savedSearch);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete saved search
  app.delete('/api/saved-searches/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteSavedSearch(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== Dashboard ====================

  // Get dashboard stats
  app.get('/api/dashboard/stats', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const stats = await storage.getDashboardStats(user.id, user.role);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== Payments ====================

  // Get pricing plans
  app.get('/api/plans', async (req: Request, res: Response) => {
    try {
      const plansList = await storage.listPlans({ isActive: true });
      res.json(plansList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single plan
  app.get('/api/plans/:id', async (req: Request, res: Response) => {
    try {
      const plan = await storage.getPlan(req.params.id);
      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }
      res.json(plan);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create payment intent
  app.post('/api/create-payment-intent', requireAuth, async (req: Request, res: Response) => {
    try {
      const { planId, amount } = req.body;

      const plan = await storage.getPlan(planId);
      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: plan.price,
        currency: 'usd',
        metadata: {
          userId: req.session.userId!,
          planId: plan.id,
          credits: plan.credits.toString(),
        },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Stripe webhook
  app.post('/api/stripe-webhook', async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      // Check if payment already processed
      const existing = await storage.getPaymentByStripeId(paymentIntent.id);
      if (existing) {
        return res.json({ received: true });
      }

      // Create payment record
      const payment = await storage.createPayment({
        userId: paymentIntent.metadata.userId,
        planId: paymentIntent.metadata.planId,
        stripePaymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        status: 'completed',
      });

      // Add credits to user's account
      const credits = parseInt(paymentIntent.metadata.credits || '0');
      await storage.addCredits({
        userId: paymentIntent.metadata.userId,
        amount: credits,
        tier: 'normal' as const,
        balance: credits,
        reason: `Purchased ${credits} credits`,
        paymentId: payment.id,
      });
    }

    res.json({ received: true });
  });

  // ==================== Admin ====================

  // Get admin stats
  app.get('/api/admin/stats', requireRole('admin'), async (req: Request, res: Response) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get pending jobs
  app.get('/api/admin/jobs/pending', requireRole('admin'), async (req: Request, res: Response) => {
    try {
      const jobsList = await storage.listJobs({ status: 'pending' });
      res.json(jobsList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Approve job
  app.post('/api/admin/jobs/:id/approve', requireRole('admin'), async (req: Request, res: Response) => {
    try {
      const job = await storage.approveJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      res.json(job);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Reject job
  app.post('/api/admin/jobs/:id/reject', requireRole('admin'), async (req: Request, res: Response) => {
    try {
      const job = await storage.rejectJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      res.json(job);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get pending companies
  app.get('/api/admin/companies/pending', requireRole('admin'), async (req: Request, res: Response) => {
    try {
      const companiesList = await storage.listCompanies({ isApproved: false });
      res.json(companiesList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Approve company
  app.post('/api/admin/companies/:id/approve', requireRole('admin'), async (req: Request, res: Response) => {
    try {
      const company = await storage.approveCompany(req.params.id);
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }
      res.json(company);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
