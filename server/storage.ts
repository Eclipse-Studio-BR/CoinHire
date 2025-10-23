import { db } from "./db";
import { eq, and, desc, like, gte, lte, sql, or } from "drizzle-orm";
import {
  users,
  companies,
  jobs,
  applications,
  talentProfiles,
  savedJobs,
  savedSearches,
  plans,
  payments,
  creditLedger,
  type User,
  type InsertUser,
  type Company,
  type InsertCompany,
  type Job,
  type InsertJob,
  type Application,
  type InsertApplication,
  type TalentProfile,
  type InsertTalentProfile,
  type SavedJob,
  type InsertSavedJob,
  type SavedSearch,
  type InsertSavedSearch,
  type Plan,
  type Payment,
  type InsertPayment,
  type CreditLedger,
  type InsertCreditLedger,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;

  // Companies
  getCompany(id: string): Promise<Company | undefined>;
  getCompanyBySlug(slug: string): Promise<Company | undefined>;
  listCompanies(filters?: { search?: string; isApproved?: boolean }): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, updates: Partial<InsertCompany>): Promise<Company | undefined>;
  approveCompany(id: string): Promise<Company | undefined>;

  // Jobs
  getJob(id: string): Promise<Job | undefined>;
  listJobs(filters?: {
    search?: string;
    category?: string;
    companyId?: string;
    status?: string;
    tier?: string;
    isRemote?: boolean;
    experienceLevel?: string;
    jobType?: string;
  }): Promise<Job[]>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: string, updates: Partial<InsertJob>): Promise<Job | undefined>;
  incrementJobView(id: string): Promise<void>;
  incrementJobApply(id: string): Promise<void>;
  approveJob(id: string): Promise<Job | undefined>;
  rejectJob(id: string): Promise<Job | undefined>;
  expireJob(id: string): Promise<Job | undefined>;

  // Applications
  getApplication(id: string): Promise<Application | undefined>;
  listApplications(filters?: { userId?: string; jobId?: string; status?: string }): Promise<Application[]>;
  createApplication(application: InsertApplication): Promise<Application>;
  updateApplication(id: string, updates: Partial<InsertApplication>): Promise<Application | undefined>;

  // Talent Profiles
  getTalentProfile(userId: string): Promise<TalentProfile | undefined>;
  createTalentProfile(profile: InsertTalentProfile): Promise<TalentProfile>;
  updateTalentProfile(userId: string, updates: Partial<InsertTalentProfile>): Promise<TalentProfile | undefined>;

  // Saved Jobs
  getSavedJobs(userId: string): Promise<SavedJob[]>;
  createSavedJob(savedJob: InsertSavedJob): Promise<SavedJob>;
  deleteSavedJob(userId: string, jobId: string): Promise<void>;

  // Saved Searches
  getSavedSearches(userId: string): Promise<SavedSearch[]>;
  createSavedSearch(savedSearch: InsertSavedSearch): Promise<SavedSearch>;
  deleteSavedSearch(id: string): Promise<void>;

  // Plans
  getPlan(id: string): Promise<Plan | undefined>;
  listPlans(filters?: { isActive?: boolean }): Promise<Plan[]>;

  // Payments
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentByStripeId(stripePaymentIntentId: string): Promise<Payment | undefined>;

  // Credit Ledger
  getCreditBalance(userId: string): Promise<number>;
  addCredits(entry: InsertCreditLedger): Promise<CreditLedger>;
  deductCredits(entry: InsertCreditLedger): Promise<CreditLedger>;

  // Stats
  getDashboardStats(userId: string, role: string): Promise<any>;
  getAdminStats(): Promise<any>;
}

export class DbStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  // Companies
  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async getCompanyBySlug(slug: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.slug, slug));
    return company;
  }

  async listCompanies(filters?: { search?: string; isApproved?: boolean }): Promise<Company[]> {
    let query = db.select().from(companies);

    const conditions = [];
    if (filters?.search) {
      conditions.push(
        or(
          like(companies.name, `%${filters.search}%`),
          like(companies.location, `%${filters.search}%`)
        )
      );
    }
    if (filters?.isApproved !== undefined) {
      conditions.push(eq(companies.isApproved, filters.isApproved));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return query.orderBy(desc(companies.createdAt));
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies).values(insertCompany).returning();
    return company;
  }

  async updateCompany(id: string, updates: Partial<InsertCompany>): Promise<Company | undefined> {
    const [company] = await db.update(companies).set(updates).where(eq(companies.id, id)).returning();
    return company;
  }

  async approveCompany(id: string): Promise<Company | undefined> {
    const [company] = await db
      .update(companies)
      .set({ isApproved: true })
      .where(eq(companies.id, id))
      .returning();
    return company;
  }

  // Jobs
  async getJob(id: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }

  async listJobs(filters?: {
    search?: string;
    category?: string;
    companyId?: string;
    status?: string;
    tier?: string;
    isRemote?: boolean;
    experienceLevel?: string;
    jobType?: string;
  }): Promise<Job[]> {
    let query = db.select().from(jobs);

    const conditions = [];
    if (filters?.search) {
      conditions.push(
        or(
          like(jobs.title, `%${filters.search}%`),
          like(jobs.description, `%${filters.search}%`)
        )
      );
    }
    if (filters?.category) {
      conditions.push(eq(jobs.category, filters.category));
    }
    if (filters?.companyId) {
      conditions.push(eq(jobs.companyId, filters.companyId));
    }
    if (filters?.status) {
      conditions.push(sql`${jobs.status} = ${filters.status}`);
    }
    if (filters?.tier) {
      conditions.push(sql`${jobs.tier} = ${filters.tier}`);
    }
    if (filters?.isRemote !== undefined) {
      conditions.push(eq(jobs.isRemote, filters.isRemote));
    }
    if (filters?.experienceLevel) {
      conditions.push(sql`${jobs.experienceLevel} = ${filters.experienceLevel}`);
    }
    if (filters?.jobType) {
      conditions.push(sql`${jobs.jobType} = ${filters.jobType}`);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Order by tier priority (premium > featured > normal), then by date
    return query.orderBy(
      sql`CASE 
        WHEN ${jobs.tier} = 'premium' THEN 1 
        WHEN ${jobs.tier} = 'featured' THEN 2 
        ELSE 3 
      END`,
      desc(jobs.publishedAt),
      desc(jobs.createdAt)
    );
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const [job] = await db.insert(jobs).values(insertJob).returning();
    return job;
  }

  async updateJob(id: string, updates: Partial<InsertJob>): Promise<Job | undefined> {
    const [job] = await db.update(jobs).set(updates).where(eq(jobs.id, id)).returning();
    return job;
  }

  async incrementJobView(id: string): Promise<void> {
    await db
      .update(jobs)
      .set({ viewCount: sql`${jobs.viewCount} + 1` })
      .where(eq(jobs.id, id));
  }

  async incrementJobApply(id: string): Promise<void> {
    await db
      .update(jobs)
      .set({ applyCount: sql`${jobs.applyCount} + 1` })
      .where(eq(jobs.id, id));
  }

  async approveJob(id: string): Promise<Job | undefined> {
    const job = await this.getJob(id);
    if (!job) return undefined;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (job.visibilityDays || 30));

    const [updatedJob] = await db
      .update(jobs)
      .set({
        status: 'active',
        publishedAt: new Date(),
        expiresAt,
      })
      .where(eq(jobs.id, id))
      .returning();
    return updatedJob;
  }

  async rejectJob(id: string): Promise<Job | undefined> {
    const [job] = await db
      .update(jobs)
      .set({ status: 'rejected' })
      .where(eq(jobs.id, id))
      .returning();
    return job;
  }

  async expireJob(id: string): Promise<Job | undefined> {
    const [job] = await db
      .update(jobs)
      .set({ status: 'expired' })
      .where(eq(jobs.id, id))
      .returning();
    return job;
  }

  // Applications
  async getApplication(id: string): Promise<Application | undefined> {
    const [application] = await db.select().from(applications).where(eq(applications.id, id));
    return application;
  }

  async listApplications(filters?: {
    userId?: string;
    jobId?: string;
    status?: string;
  }): Promise<Application[]> {
    let query = db.select().from(applications);

    const conditions = [];
    if (filters?.userId) {
      conditions.push(eq(applications.userId, filters.userId));
    }
    if (filters?.jobId) {
      conditions.push(eq(applications.jobId, filters.jobId));
    }
    if (filters?.status) {
      conditions.push(sql`${applications.status} = ${filters.status}`);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return query.orderBy(desc(applications.createdAt));
  }

  async createApplication(insertApplication: InsertApplication): Promise<Application> {
    const [application] = await db.insert(applications).values(insertApplication).returning();
    await this.incrementJobApply(insertApplication.jobId);
    return application;
  }

  async updateApplication(id: string, updates: Partial<InsertApplication>): Promise<Application | undefined> {
    const [application] = await db
      .update(applications)
      .set(updates)
      .where(eq(applications.id, id))
      .returning();
    return application;
  }

  // Talent Profiles
  async getTalentProfile(userId: string): Promise<TalentProfile | undefined> {
    const [profile] = await db.select().from(talentProfiles).where(eq(talentProfiles.userId, userId));
    return profile;
  }

  async createTalentProfile(insertProfile: InsertTalentProfile): Promise<TalentProfile> {
    const [profile] = await db.insert(talentProfiles).values(insertProfile).returning();
    return profile;
  }

  async updateTalentProfile(userId: string, updates: Partial<InsertTalentProfile>): Promise<TalentProfile | undefined> {
    const [profile] = await db
      .update(talentProfiles)
      .set(updates)
      .where(eq(talentProfiles.userId, userId))
      .returning();
    return profile;
  }

  // Saved Jobs
  async getSavedJobs(userId: string): Promise<SavedJob[]> {
    return db.select().from(savedJobs).where(eq(savedJobs.userId, userId)).orderBy(desc(savedJobs.createdAt));
  }

  async createSavedJob(insertSavedJob: InsertSavedJob): Promise<SavedJob> {
    const [savedJob] = await db.insert(savedJobs).values(insertSavedJob).returning();
    return savedJob;
  }

  async deleteSavedJob(userId: string, jobId: string): Promise<void> {
    await db
      .delete(savedJobs)
      .where(and(eq(savedJobs.userId, userId), eq(savedJobs.jobId, jobId)));
  }

  // Saved Searches
  async getSavedSearches(userId: string): Promise<SavedSearch[]> {
    return db
      .select()
      .from(savedSearches)
      .where(eq(savedSearches.userId, userId))
      .orderBy(desc(savedSearches.createdAt));
  }

  async createSavedSearch(insertSavedSearch: InsertSavedSearch): Promise<SavedSearch> {
    const [savedSearch] = await db.insert(savedSearches).values(insertSavedSearch).returning();
    return savedSearch;
  }

  async deleteSavedSearch(id: string): Promise<void> {
    await db.delete(savedSearches).where(eq(savedSearches.id, id));
  }

  // Plans
  async getPlan(id: string): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    return plan;
  }

  async listPlans(filters?: { isActive?: boolean }): Promise<Plan[]> {
    let query = db.select().from(plans);

    if (filters?.isActive !== undefined) {
      query = query.where(eq(plans.isActive, filters.isActive)) as any;
    }

    return query.orderBy(plans.price);
  }

  // Payments
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(insertPayment).returning();
    return payment;
  }

  async getPaymentByStripeId(stripePaymentIntentId: string): Promise<Payment | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.stripePaymentIntentId, stripePaymentIntentId));
    return payment;
  }

  // Credit Ledger
  async getCreditBalance(userId: string): Promise<number> {
    const result = await db
      .select({ balance: sql<number>`COALESCE(SUM(${creditLedger.amount}), 0)` })
      .from(creditLedger)
      .where(eq(creditLedger.userId, userId));

    return result[0]?.balance || 0;
  }

  async addCredits(entry: InsertCreditLedger): Promise<CreditLedger> {
    const [ledgerEntry] = await db.insert(creditLedger).values(entry).returning();
    return ledgerEntry;
  }

  async deductCredits(entry: InsertCreditLedger): Promise<CreditLedger> {
    const [ledgerEntry] = await db.insert(creditLedger).values({
      ...entry,
      amount: -Math.abs(entry.amount),
    }).returning();
    return ledgerEntry;
  }

  // Stats
  async getDashboardStats(userId: string, role: string): Promise<any> {
    if (role === 'talent') {
      const applicationsCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(applications)
        .where(eq(applications.userId, userId));

      const savedJobsCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(savedJobs)
        .where(eq(savedJobs.userId, userId));

      return {
        applicationsCount: applicationsCount[0]?.count || 0,
        savedJobsCount: savedJobsCount[0]?.count || 0,
      };
    }

    if (role === 'employer' || role === 'recruiter') {
      const userJobs = await this.listJobs({ status: 'active' });

      const activeJobsCount = userJobs.length;
      const totalViews = userJobs.reduce((sum, job) => sum + job.viewCount, 0);
      const totalApplications = userJobs.reduce((sum, job) => sum + job.applyCount, 0);
      const creditsBalance = await this.getCreditBalance(userId);

      return {
        activeJobsCount,
        totalViews,
        totalApplications,
        creditsBalance,
      };
    }

    return {};
  }

  async getAdminStats(): Promise<any> {
    const totalJobs = await db.select({ count: sql<number>`count(*)` }).from(jobs);
    const totalCompanies = await db.select({ count: sql<number>`count(*)` }).from(companies);
    const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);

    return {
      totalJobs: totalJobs[0]?.count || 0,
      totalCompanies: totalCompanies[0]?.count || 0,
      totalUsers: totalUsers[0]?.count || 0,
    };
  }
}

export const storage = new DbStorage();
