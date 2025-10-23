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

  // Get employer's companies
  app.get('/api/employer/companies', requireRole('employer', 'recruiter'), async (req: Request, res: Response) => {
    try {
      // In a full implementation, we'd track company ownership via company_members table
      // For now, return all approved companies
      const companiesList = await storage.listCompanies({ isApproved: true });
      res.json(companiesList);
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

  // Get employer's jobs
  app.get('/api/employer/jobs', requireRole('employer', 'recruiter'), async (req: Request, res: Response) => {
    try {
      // In a full implementation, we'd filter by company membership
      // For now, return all jobs
      const jobsList = await storage.listJobs({});
      res.json(jobsList);
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
