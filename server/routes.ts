import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerAuth, requireAuth, requireRole } from "./auth";
import { insertJobSchema, insertCompanySchema, insertApplicationSchema, type InsertTalentProfile } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import "./types";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { generateUniqueCompanySlug } from "./utils/slug";
import {
  createCryptoPayment,
  getPaymentStatus,
  handleWebhook,
  getAvailableCurrencies,
} from "./crypto/nowpayments";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe key: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const createCompanySchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  website: z
    .string()
    .url()
    .optional()
    .or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  size: z.string().optional().or(z.literal("")),
  logo: z.string().optional().or(z.literal("")),
  twitter: z.string().url().optional().or(z.literal("")),
});

const optionalNumericString = () =>
  z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) {
        return null;
      }
      if (typeof val === "string") {
        const parsed = Number(val);
        return Number.isFinite(parsed) ? Math.round(parsed) : val;
      }
      return val;
    },
    z.number().int().min(0).nullable().optional(),
  );

const talentProfileUpdateSchema = z.object({
  title: z.string().min(2).optional(),
  story: z.string().min(10).optional(),
  location: z.string().min(2).optional(),
  timezone: z.string().min(2).optional(),
  hourlyRate: optionalNumericString(),
  monthlyRate: optionalNumericString(),
  skills: z.string().optional(),
  languages: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  telegram: z.string().optional(),
});

const LOCAL_UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");
const LOCAL_LOGO_DIR = path.join(LOCAL_UPLOADS_ROOT, "logos");
const LOCAL_AVATAR_DIR = path.join(LOCAL_UPLOADS_ROOT, "avatars");
const LOCAL_RESUME_DIR = path.join(LOCAL_UPLOADS_ROOT, "resumes");

function ensureDirExists(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function splitCommaList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const LOGO_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const LOGO_EXTENSION_FALLBACK: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

const RESUME_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const RESUME_EXTENSION_FALLBACK: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function createLocalUploader(options: {
  targetDir: string;
  mimeTypes: string[];
  extensionFallback: Record<string, string>;
}) {
  const { targetDir, mimeTypes, extensionFallback } = options;
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        ensureDirExists(targetDir);
        cb(null, targetDir);
      },
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname) || extensionFallback[file.mimetype] || "";
        cb(null, `${Date.now()}-${randomUUID()}${ext}`);
      },
    }),
    fileFilter: (_req, file, cb) => {
      if (mimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Unsupported file type"));
      }
    },
    limits: {
      fileSize: MAX_UPLOAD_BYTES,
    },
  });
}

const localLogoUploader = createLocalUploader({
  targetDir: LOCAL_LOGO_DIR,
  mimeTypes: LOGO_MIME_TYPES,
  extensionFallback: LOGO_EXTENSION_FALLBACK,
});

const localAvatarUploader = createLocalUploader({
  targetDir: LOCAL_AVATAR_DIR,
  mimeTypes: LOGO_MIME_TYPES,
  extensionFallback: LOGO_EXTENSION_FALLBACK,
});

const localResumeUploader = createLocalUploader({
  targetDir: LOCAL_RESUME_DIR,
  mimeTypes: RESUME_MIME_TYPES,
  extensionFallback: RESUME_EXTENSION_FALLBACK,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  registerAuth(app);
  await storage.ensureDefaultPlans();

  const registerLocalUploadRoute = (
    route: string,
    uploader: multer.Multer,
    subDir: string,
    contextLabel: string,
    options?: { requiresAuth?: boolean },
  ) => {
    const middlewares: Array<(req: Request, res: Response, next: (err?: any) => void) => void> = [];
    if (options?.requiresAuth !== false) {
      middlewares.push(requireAuth);
    }

    middlewares.push((req, res, next) => {
      uploader.single("file")(req as any, res as any, (err: any) => {
        if (err) {
          console.error(`${contextLabel} upload error:`, err);
          if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({ error: `${contextLabel} exceeds the 5MB limit.` });
          }
          return res.status(400).json({ error: err.message || "Upload failed" });
        }
        next();
      });
    });

    middlewares.push((req, res) => {
      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file) {
        return res.status(400).json({ error: "Missing file upload" });
      }
      const publicPath = `/uploads/${subDir}/${path.basename(file.path)}`;
      return res.status(200).json({ objectPath: publicPath });
    });

    app.post(route, ...middlewares);
  };

  registerLocalUploadRoute("/api/uploads/logo", localLogoUploader, "logos", "Logo file");
  registerLocalUploadRoute("/api/uploads/avatar", localAvatarUploader, "avatars", "Avatar file");
  registerLocalUploadRoute("/api/uploads/resume", localResumeUploader, "resumes", "Resume file");
  registerLocalUploadRoute("/api/uploads/public/logo", localLogoUploader, "logos", "Logo file", { requiresAuth: false });
  registerLocalUploadRoute("/api/uploads/public/avatar", localAvatarUploader, "avatars", "Avatar file", { requiresAuth: false });

  // ==================== Object Storage ====================
  // Based on blueprint:javascript_object_storage
  
  // Serve protected uploaded files (resumes, logos) with ACL checking
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      
      // Get user ID from session if authenticated
      const userId = req.session?.userId;
      
      // Check ACL permissions
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId,
        requestedPermission: ObjectPermission.READ,
      });
      
      if (!canAccess) {
        return res.sendStatus(403);
      }
      
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Get presigned upload URL for client-side uploads
  app.post("/api/objects/upload", requireAuth, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error: any) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Set ACL policy for uploaded resume
  app.put("/api/objects/resume", requireAuth, async (req, res) => {
    try {
      if (!req.body.resumeURL) {
        return res.status(400).json({ error: "resumeURL is required" });
      }

      const userId = req.session.userId!;
      const objectStorageService = new ObjectStorageService();
      
      // Set ACL: owner only (private resume)
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.resumeURL,
        {
          owner: userId,
          visibility: "private", // Only owner can access
        }
      );

      res.status(200).json({ objectPath });
    } catch (error: any) {
      console.error("Error setting resume ACL:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Set ACL policy for uploaded company logo
  app.put("/api/objects/logo", requireAuth, async (req, res) => {
    try {
      if (!req.body.logoURL) {
        return res.status(400).json({ error: "logoURL is required" });
      }

      const userId = req.session.userId!;
      const objectStorageService = new ObjectStorageService();
      
      // Set ACL: public visibility so anyone can see company logos
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.logoURL,
        {
          owner: userId,
          visibility: "public",
        }
      );

      res.status(200).json({ objectPath });
    } catch (error: any) {
      console.error("Error setting logo ACL:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Set ACL policy for uploaded user avatar
  app.put("/api/objects/avatar", requireAuth, async (req, res) => {
    try {
      if (!req.body.avatarURL) {
        return res.status(400).json({ error: "avatarURL is required" });
      }

      const userId = req.session.userId!;
      const objectStorageService = new ObjectStorageService();

      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.avatarURL,
        {
          owner: userId,
          visibility: "public",
        },
      );

      res.status(200).json({ objectPath });
    } catch (error: any) {
      console.error("Error setting avatar ACL:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Serve public assets (if needed in future)
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error: any) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: error.message });
    }
  });

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
        tier,  
        location,
      } = req.query;

      const filters: any = {
        status: 'active', 
      };

      if (search) filters.search = search as string;
      if (category && category !== 'all') filters.category = category as string;
      if (type && type !== 'all') filters.jobType = type as string;
      if (level && level !== 'all') filters.experienceLevel = level as string;
      if (remote === 'true') filters.isRemote = true;
      if (companyId) filters.companyId = companyId as string;
      if (tier) filters.tier = tier as string;  

      const jobsList = await storage.listJobs(filters);

      // Auto-expire jobs that have passed their expiresAt date
      const now = new Date();
      const validJobs = jobsList.filter(job => {
        if (job.expiresAt && new Date(job.expiresAt) <= now) {
          // Expire the job automatically
          storage.expireJob(job.id).catch(err => console.error('Error expiring job:', err));
          return false;
        }
        return true;
      });

      const jobsWithCompanies = await Promise.all(
        validJobs.map(async (job) => {
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

      const now = new Date();
      const visibilityDays = validatedData.visibilityDays ?? 30;
      
      // Always create jobs as 'normal' tier - users must explicitly upgrade to featured
      const job = await storage.createJob({
        ...validatedData,
        status: 'active',
        tier: 'normal', // Always start as normal/free tier
        visibilityDays,
        publishedAt: now,
        expiresAt: new Date(now.getTime() + visibilityDays * 24 * 60 * 60 * 1000),
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
      
      // Get all active applications (interview status) for this job
      const applications = await storage.listApplications({ jobId: req.params.id });
      const activeApplications = applications.filter(app => app.status === 'interview');
      
      // Get company info for rejection message
      const company = await storage.getCompany(job.companyId);
      
      // Reject all active applications and send rejection message
      for (const application of activeApplications) {
        // Get applicant details
        const applicant = await storage.getUser(application.userId);
        
        // Mark application as rejected
        await storage.updateApplication(application.id, { status: 'rejected' });
        
        // Send automated rejection message
        const rejectionMessage = `Dear ${applicant?.firstName || 'Applicant'},

Thank you for your interest in ${company?.name || 'our company'} and the time you spent in applying for the ${job.title} position. We regret to inform you that we have closed the search for this role.

We will be advertising more positions in the coming months however and hope you'll keep us in mind and we encourage you to apply again.

We wish you all the best in your job search and future professional endeavors.

Best,
${company?.name || 'The Team'}`;

        await storage.createMessage({
          applicationId: application.id,
          senderId: req.session.userId!,
          message: rejectionMessage,
          isRead: false,
        });
        
        console.log(`✅ Auto-rejected application ${application.id} due to job deletion`);
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

      // Check if already applied or has been rejected
      const existingApplications = await storage.listApplications({
        userId: req.session.userId!,
        jobId: req.params.id,
      });

      if (existingApplications.length > 0) {
        const hasRejected = existingApplications.some(app => app.status === 'rejected');
        if (hasRejected) {
          return res.status(403).json({ error: 'You cannot reapply to a job where your application was rejected' });
        }
        return res.status(400).json({ error: 'You have already applied to this job' });
      }

      const application = await storage.createApplication({
        userId: req.session.userId!,
        jobId: req.params.id,
        coverLetter: req.body.coverLetter,
        resumeUrl: req.body.resumeUrl,
        status: 'submitted',
      });

      if (req.body.resumeUrl) {
        try {
          const objectStorageService = new ObjectStorageService();
          await objectStorageService.grantCompanyReadAccess(
            req.body.resumeUrl,
            job.companyId,
          );
        } catch (error) {
          console.error("Error granting company resume access:", error);
        }
      }

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

      const companiesWithStats = await Promise.all(
        companiesList.map(async (company) => {
          const activeJobs = await storage.listJobs({
            companyId: company.id,
            status: 'active',
          });

          return {
            ...company,
            jobCount: activeJobs.length,
          };
        })
      );

      res.json(companiesWithStats);
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
      const parsedData = createCompanySchema.parse(req.body);
      const normalizedData = {
        ...parsedData,
        website: parsedData.website || undefined,
        location: parsedData.location || undefined,
        size: parsedData.size || undefined,
        logo: parsedData.logo || undefined,
        twitter: parsedData.twitter || undefined,
      };

      const user = await storage.getUser(req.session.userId!);
      const existingCompanyIds = await storage.getUserCompanyIds(req.session.userId!);
      if (existingCompanyIds.length > 0 && user?.role !== 'admin') {
        return res.status(400).json({ error: 'Employers can only create one company' });
      }

      const slug = await generateUniqueCompanySlug(parsedData.name);

      const company = await storage.createCompany({
        ...normalizedData,
        slug,
        isApproved: true,
        isHiring: true,
      });

      await storage.addCompanyMember({
        companyId: company.id,
        userId: req.session.userId!,
        isOwner: true,
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

app.delete('/api/companies/:id', requireRole('admin'), async (req, res) => {
  try {
    const company = await storage.getCompany(req.params.id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const user = await storage.getUser(req.session.userId!);
    const isAdmin = user?.role === 'admin';

    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can delete companies' });
    }

    await storage.deleteCompany(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

  // Get employer's companies
  app.get('/api/employer/companies', requireRole('employer', 'recruiter'), async (req: Request, res: Response) => {
    try {
      // Get company IDs user is a member of
      const userCompanyIds = await storage.getUserCompanyIds(req.session.userId!);
      
      if (userCompanyIds.length === 0) {
        return res.json([]);
      }

      const companiesList = await Promise.all(
        userCompanyIds.map(async (companyId) => storage.getCompany(companyId)),
      );

      const userCompanies = companiesList
        .filter((company): company is NonNullable<typeof company> => Boolean(company));

      const companiesWithStats = await Promise.all(
        userCompanies.map(async (company) => {
          const activeJobs = await storage.listJobs({
            companyId: company.id,
            status: 'active',
          });

          return {
            ...company,
            jobCount: activeJobs.length,
          };
        }),
      );
      
      res.json(companiesWithStats);
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
      const userJobs = jobsList
        .filter(job => userCompanyIds.includes(job.companyId))
        .filter(job => job.status !== 'expired');
      
      // Enrich with company and application data
      const jobsWithData = await Promise.all(
        userJobs.map(async (job) => {
          const company = await storage.getCompany(job.companyId);
          const applicationsList = await storage.listApplications({ jobId: job.id });
          // Count only non-rejected applications
          const activeApplications = applicationsList.filter(app => app.status !== 'rejected');
          return { ...job, company, applicationsCount: activeApplications.length, applications: applicationsList };
        })
      );
      
      res.json(jobsWithData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/employer/applications', requireRole('employer', 'recruiter'), async (req: Request, res: Response) => {
    try {
      const employerApplications = await storage.listEmployerApplications(req.session.userId!);
      res.json(employerApplications);
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
            
            // Check if job is expired and application is still in interview status
            if (application.status === 'interview' && job.status === 'expired') {
              console.log(`⚠️ Found interview with expired job: ${application.id}`);
              
              // Get applicant details for personalized message
              const applicant = await storage.getUser(application.userId);
              
              // Mark application as rejected
              await storage.updateApplication(application.id, { status: 'rejected' });
              
              // Send automated rejection message
              const rejectionMessage = `Dear ${applicant?.firstName || 'Applicant'},

Thank you for your interest in ${company?.name || 'our company'} and the time you spent in applying for the ${job.title} position. We regret to inform you that we have closed the search for this role.

We will be advertising more positions in the coming months however and hope you'll keep us in mind and we encourage you to apply again.

We wish you all the best in your job search and future professional endeavors.

Best,
${company?.name || 'The Team'}`;

              // Check if rejection message already sent
              const existingMessages = await storage.listMessages(application.id);
              const hasRejectionMessage = existingMessages.some(msg => 
                msg.message.includes('We regret to inform you that we have closed the search for this role')
              );
              
              if (!hasRejectionMessage) {
                await storage.createMessage({
                  applicationId: application.id,
                  senderId: req.session.userId!, // System message from the user's perspective
                  message: rejectionMessage,
                  isRead: false,
                });
                console.log(`✅ Auto-rejected application ${application.id} - job expired`);
              }
              
              // Return with updated status
              return { ...application, status: 'rejected', job: { ...job, company } };
            }
            
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

  app.delete('/api/applications/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const existingApplication = await storage.getApplication(req.params.id);
      if (!existingApplication) {
        return res.status(404).json({ error: 'Application not found' });
      }

      const job = await storage.getJob(existingApplication.jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const user = await storage.getUser(req.session.userId!);
      const isTalent = existingApplication.userId === req.session.userId;
      const isMember = await storage.isCompanyMember(req.session.userId!, job.companyId);

      // Talents can only delete their own rejected applications
      if (isTalent && existingApplication.status !== 'rejected') {
        return res.status(403).json({ error: 'You can only delete rejected applications' });
      }

      // Check authorization: talent (own rejected app), employer (company member), or admin
      if (!isTalent && !isMember && user?.role !== 'admin') {
        return res.status(403).json({ error: 'You do not have permission to delete this application' });
      }

      await storage.deleteApplication(existingApplication.id);
      res.status(204).end();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ==================== Messages ====================

  // Get messages for application
  app.get('/api/applications/:id/messages', requireAuth, async (req: Request, res: Response) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      const job = await storage.getJob(application.jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const isTalent = application.userId === req.session.userId;
      const isEmployer = await storage.isCompanyMember(req.session.userId!, job.companyId);
      const user = await storage.getUser(req.session.userId!);

      if (!isTalent && !isEmployer && user?.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const messagesList = await storage.listMessages(req.params.id);
      res.json(messagesList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Send message
  app.post('/api/applications/:id/messages', requireAuth, async (req: Request, res: Response) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      const job = await storage.getJob(application.jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const isTalent = application.userId === req.session.userId;
      const isEmployer = await storage.isCompanyMember(req.session.userId!, job.companyId);
      const user = await storage.getUser(req.session.userId!);

      if (!isTalent && !isEmployer && user?.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      if (!req.body.message || typeof req.body.message !== 'string' || !req.body.message.trim()) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const message = await storage.createMessage({
        applicationId: req.params.id,
        senderId: req.session.userId!,
        message: req.body.message.trim(),
        isRead: false,
      });

      // If employer sends first message and status is submitted, update to interview
      if (isEmployer && application.status === 'submitted') {
        await storage.updateApplication(req.params.id, { status: 'interview' });
      }

      res.json(message);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Mark messages as read
  app.put('/api/applications/:id/messages/read', requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.markMessagesAsRead(req.params.id, req.session.userId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Close chat and reject application (employer only)
  app.post('/api/applications/:id/close-chat', requireRole('employer', 'recruiter'), async (req: Request, res: Response) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      const job = await storage.getJob(application.jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const isMember = await storage.isCompanyMember(req.session.userId!, job.companyId);
      const user = await storage.getUser(req.session.userId!);
      if (!isMember && user?.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Get applicant and company details for the message
      const applicant = await storage.getUser(application.userId);
      const company = await storage.getCompany(job.companyId);

      // Mark application as rejected
      await storage.updateApplication(req.params.id, { status: 'rejected' });

      // Send automated rejection message
      const rejectionMessage = `Dear ${applicant?.firstName || 'Applicant'},

Thank you for your interest in ${company?.name || 'our company'} and the time you spent in applying for the ${job.title} position. We regret to inform you that we have closed the search for this role.

We will be advertising more positions in the coming months however and hope you'll keep us in mind and we encourage you to apply again.

We wish you all the best in your job search and future professional endeavors.

Best,
${company?.name || 'The Team'}`;

      await storage.createMessage({
        applicationId: req.params.id,
        senderId: req.session.userId!,
        message: rejectionMessage,
        isRead: false,
      });

      res.json({ success: true });
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

  // Talent Profile
  app.get('/api/talent/profile', requireRole('talent'), async (req: Request, res: Response) => {
    try {
      const profile = await storage.getTalentProfile(req.session.userId!);
      res.json(profile ?? null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all public talent profiles
  app.get('/api/talents/public', async (req: Request, res: Response) => {
    try {
      const publicTalents = await storage.getPublicTalentProfiles();
      res.json(publicTalents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Toggle talent profile visibility
  app.put('/api/talent/profile/visibility', requireRole('talent'), async (req: Request, res: Response) => {
    try {
      const { isPublic } = req.body;
      
      if (typeof isPublic !== 'boolean') {
        return res.status(400).json({ error: 'isPublic must be a boolean' });
      }

      const userId = req.session.userId!;
      const existingProfile = await storage.getTalentProfile(userId);

      if (!existingProfile) {
        // Create profile if it doesn't exist
        const created = await storage.createTalentProfile({
          userId,
          headline: "",
          bio: "",
          skills: [],
          languages: [],
          location: "",
          timezone: "",
          hourlyRate: null,
          monthlyRate: null,
          portfolioUrl: null,
          githubUrl: null,
          experience: null,
          education: null,
          linkedinUrl: null,
          telegram: null,
          resumeUrl: null,
          isPublic,
        });
        return res.json(created);
      }

      const updatedProfile = await storage.updateTalentProfile(userId, { isPublic });
      res.json(updatedProfile);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update talent profile preferences
  app.put('/api/talent/profile/preferences', requireRole('talent'), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const existingProfile = await storage.getTalentProfile(userId);

      if (!existingProfile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      // Validate and extract only preference fields
      const updates: Partial<InsertTalentProfile> = {};
      
      if (req.body.preferredJobTypes !== undefined) {
        updates.preferredJobTypes = req.body.preferredJobTypes;
      }
      if (req.body.jobAvailability !== undefined) {
        updates.jobAvailability = req.body.jobAvailability;
      }
      if (req.body.workFlexibility !== undefined) {
        updates.workFlexibility = req.body.workFlexibility;
      }

      const updatedProfile = await storage.updateTalentProfile(userId, updates);
      res.json(updatedProfile);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/talent/profile', requireRole('talent'), async (req: Request, res: Response) => {
    try {
      const payload = talentProfileUpdateSchema.parse(req.body);
      const updates: Partial<InsertTalentProfile> = {};

      if (payload.title !== undefined) updates.headline = payload.title.trim();
      if (payload.story !== undefined) updates.bio = payload.story.trim();
      if (payload.location !== undefined) updates.location = payload.location.trim();
      if (payload.timezone !== undefined) updates.timezone = payload.timezone.trim();
      if (payload.hourlyRate !== undefined) updates.hourlyRate = payload.hourlyRate;
      if (payload.monthlyRate !== undefined) updates.monthlyRate = payload.monthlyRate;
      if (payload.skills !== undefined) updates.skills = splitCommaList(payload.skills);
      if (payload.languages !== undefined) updates.languages = splitCommaList(payload.languages);
      if (payload.linkedinUrl !== undefined) {
        const trimmed = payload.linkedinUrl.trim();
        updates.linkedinUrl = trimmed.length ? trimmed : null;
      }
      if (payload.telegram !== undefined) {
        const trimmed = payload.telegram.trim();
        updates.telegram = trimmed.length ? trimmed : null;
      }

      const userId = req.session.userId!;
      const existingProfile = await storage.getTalentProfile(userId);

      if (!existingProfile) {
        const created = await storage.createTalentProfile({
          userId,
          headline: updates.headline ?? "",
          bio: updates.bio ?? "",
          skills: updates.skills ?? [],
          languages: updates.languages ?? [],
          location: updates.location ?? "",
          timezone: updates.timezone ?? "",
          hourlyRate: updates.hourlyRate ?? null,
          monthlyRate: updates.monthlyRate ?? null,
          portfolioUrl: null,
          githubUrl: null,
          experience: null,
          education: null,
          linkedinUrl: updates.linkedinUrl ?? null,
          telegram: updates.telegram ?? null,
          resumeUrl: null,
          isPublic: true,
        });
        return res.json(created);
      }

      const updatedProfile = await storage.updateTalentProfile(userId, updates);
      res.json(updatedProfile);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.flatten() });
      }
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
      const { planId, amount, jobId, currency } = req.body;

      const plan = await storage.getPlan(planId);
      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      // Use provided currency or default to USD
      const paymentCurrency = (currency || 'usd').toLowerCase();
      const paymentAmount = amount || plan.price;

      console.log(`Creating payment intent: ${paymentAmount} ${paymentCurrency}`);

      const metadata: any = {
        userId: req.session.userId!,
        planId: plan.id,
        credits: plan.credits.toString(),
        currency: paymentCurrency,
      };

      // If jobId is provided, this is a job upgrade payment
      if (jobId) {
        metadata.jobId = jobId;
        metadata.upgradeToFeatured = 'true';
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: paymentAmount,
        currency: paymentCurrency,
        metadata,
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Add credits after payment
  app.post('/api/credits/add', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get current stats to know current balance
      const stats = await storage.getDashboardStats(req.session.userId!, user.role);
      const currentBalance = stats.creditsBalance || 0;
      
      // Add 1 credit
      await storage.addCredits({
        userId: req.session.userId!,
        amount: 1,
        tier: 'normal',
        balance: currentBalance + 1,
        reason: 'Purchased 1 credit',
      });

      console.log(`✅ Added 1 credit to user ${req.session.userId}`);

      res.json({ success: true, newBalance: currentBalance + 1 });
    } catch (error: any) {
      console.error('Error adding credits:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Upgrade job to featured (after payment confirmation or using credits)
  app.post('/api/jobs/:id/upgrade-featured', requireAuth, async (req: Request, res: Response) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // Check ownership
      const isMember = await storage.isCompanyMember(req.session.userId!, job.companyId);
      const user = await storage.getUser(req.session.userId!);
      
      if (!isMember && user?.role !== 'admin') {
        return res.status(403).json({ error: 'You do not have permission to upgrade this job' });
      }

      // Check if user has credits - deduct 1 credit if they do
      const stats = await storage.getDashboardStats(req.session.userId!, user!.role);
      if (stats.creditsBalance && stats.creditsBalance > 0) {
        // Deduct 1 credit
        await storage.addCredits({
          userId: req.session.userId!,
          amount: -1,
          tier: 'featured',
          balance: stats.creditsBalance - 1,
          reason: `Featured job: ${job.title}`,
        });
        console.log(`✅ Deducted 1 credit from user ${req.session.userId}`);
      }

      // Upgrade to featured
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const updatedJob = await storage.updateJob(req.params.id, {
        tier: 'featured',
        expiresAt,
        visibilityDays: 30,
      });

      console.log(`✅ Job ${req.params.id} upgraded to featured`);

      res.json(updatedJob);
    } catch (error: any) {
      console.error('Error upgrading job:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== Crypto Payments (NOWPayments) ====================

  // Create crypto payment
  app.post('/api/crypto/create-payment', requireAuth, createCryptoPayment);

  // Get payment status
  app.get('/api/crypto/payment-status/:paymentId', requireAuth, getPaymentStatus);

  // Webhook handler for NOWPayments
  app.post('/api/crypto/webhook', handleWebhook);

  // Get available currencies
  app.get('/api/crypto/currencies', getAvailableCurrencies);

  // ==================== Stripe Payments ====================

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
      console.error('Make sure STRIPE_WEBHOOK_SECRET is configured correctly');
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('✅ Webhook event received:', event.type);

    // Handle the event
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('Payment intent metadata:', paymentIntent.metadata);

      // Check if payment already processed
      const existing = await storage.getPaymentByStripeId(paymentIntent.id);
      if (existing) {
        console.log('Payment already processed, skipping');
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
      console.log('Payment record created:', payment.id);

      // Check if this is a job upgrade payment
      if (paymentIntent.metadata.jobId && paymentIntent.metadata.upgradeToFeatured === 'true') {
        console.log(`🌟 Upgrading job ${paymentIntent.metadata.jobId} to featured`);
        
        // Upgrade job to featured
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        try {
          await storage.updateJob(paymentIntent.metadata.jobId, {
            tier: 'featured',
            expiresAt,
            visibilityDays: 30,
          });
          
          console.log(`✅ Job ${paymentIntent.metadata.jobId} successfully upgraded to featured`);
          console.log(`Expires at: ${expiresAt.toISOString()}`);
        } catch (error) {
          console.error(`❌ Error upgrading job ${paymentIntent.metadata.jobId}:`, error);
        }
      } else {
        // Add credits to user's account (regular credit purchase)
        const credits = parseInt(paymentIntent.metadata.credits || '0');
        console.log(`Adding ${credits} credits to user ${paymentIntent.metadata.userId}`);
        
        await storage.addCredits({
          userId: paymentIntent.metadata.userId,
          amount: credits,
          tier: 'normal' as const,
          balance: credits,
          reason: `Purchased ${credits} credits`,
          paymentId: payment.id,
        });
        
        console.log(`✅ Credits added successfully`);
      }
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
