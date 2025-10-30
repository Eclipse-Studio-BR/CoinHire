import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum('user_role', ['guest', 'talent', 'employer', 'recruiter', 'admin']);
export const jobTierEnum = pgEnum('job_tier', ['normal', 'featured', 'premium']);
export const jobStatusEnum = pgEnum('job_status', ['draft', 'pending', 'active', 'expired', 'rejected']);
export const applicationStatusEnum = pgEnum('application_status', ['submitted', 'reviewing', 'shortlisted', 'interview', 'offered', 'rejected', 'withdrawn']);
export const jobTypeEnum = pgEnum('job_type', ['full_time', 'part_time', 'contract', 'internship']);
export const experienceLevelEnum = pgEnum('experience_level', ['entry', 'mid', 'senior', 'lead', 'executive']);
export const alertFrequencyEnum = pgEnum('alert_frequency', ['daily', 'weekly']);
export const salaryPeriodEnum = pgEnum('salary_period', ['year', 'month', 'week', 'hour']);
export const applicationMethodEnum = pgEnum('application_method', ['email', 'external']);

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table (required for Replit Auth, extended with role)
export const users = pgTable(
  "users",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    email: varchar("email", { length: 255 }).notNull().unique(),
    username: varchar("username", { length: 50 }).unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    firstName: varchar("first_name"),
    lastName: varchar("last_name"),
    profileImageUrl: varchar("profile_image_url"),
    resumePath: varchar("resume_path", { length: 500 }),
    role: userRoleEnum("role").default("guest").notNull(),
    lastActiveAt: timestamp("last_active_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("users_email_idx").on(table.email),
    index("users_username_idx").on(table.username),
  ],
);

// Companies table
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  description: text("description"),
  website: varchar("website", { length: 500 }),
  twitter: varchar("twitter", { length: 255 }),
  discord: varchar("discord", { length: 255 }),
  telegram: varchar("telegram", { length: 255 }),
  logo: varchar("logo", { length: 500 }),
  location: varchar("location", { length: 255 }),
  size: varchar("size", { length: 50 }),
  currentSize: varchar("current_size", { length: 50 }),
  paymentInCrypto: boolean("payment_in_crypto").default(false).notNull(),
  remoteWorking: boolean("remote_working").default(false).notNull(),
  isApproved: boolean("is_approved").default(false).notNull(),
  isHiring: boolean("is_hiring").default(true).notNull(),
  createdByAdmin: boolean("created_by_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Company members (links users to companies)
export const companyMembers = pgTable("company_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  isOwner: boolean("is_owner").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Jobs table
export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  requirements: text("requirements"),
  responsibilities: text("responsibilities"),
  category: varchar("category", { length: 100 }),
  location: varchar("location", { length: 255 }),
  isRemote: boolean("is_remote").default(false).notNull(),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  salaryCurrency: varchar("salary_currency", { length: 10 }).default('USD'),
  salaryPeriod: salaryPeriodEnum("salary_period").default('month').notNull(),
  jobType: jobTypeEnum("job_type").default('full_time').notNull(),
  experienceLevel: experienceLevelEnum("experience_level").default('mid').notNull(),
  tier: jobTierEnum("tier").default('normal').notNull(),
  status: jobStatusEnum("status").default('draft').notNull(),
  externalUrl: varchar("external_url", { length: 500 }),
  applicationMethod: applicationMethodEnum("application_method").default('email').notNull(),
  applicationEmail: varchar("application_email", { length: 255 }),
  tags: text("tags").array(),
  viewCount: integer("view_count").default(0).notNull(),
  applyCount: integer("apply_count").default(0).notNull(),
  visibilityDays: integer("visibility_days").default(30).notNull(),
  publishedAt: timestamp("published_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Talent profiles
export const talentProfiles = pgTable("talent_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  headline: varchar("headline", { length: 255 }),
  bio: text("bio"),
  skills: text("skills").array(),
  tools: text("tools").array(),
  languages: text("languages").array(),
  experience: text("experience"),
  education: text("education"),
  location: varchar("location", { length: 255 }),
  timezone: varchar("timezone", { length: 100 }),
  hourlyRate: integer("hourly_rate"),
  monthlyRate: integer("monthly_rate"),
  portfolioUrl: varchar("portfolio_url", { length: 500 }),
  githubUrl: varchar("github_url", { length: 500 }),
  linkedinUrl: varchar("linkedin_url", { length: 500 }),
  telegram: varchar("telegram", { length: 255 }),
  resumeUrl: varchar("resume_url", { length: 500 }),
  isPublic: boolean("is_public").default(true).notNull(),
  // New preference fields
  preferredJobTypes: text("preferred_job_types").array(), // ['full_time', 'part_time', 'contract', 'internship']
  jobAvailability: varchar("job_availability", { length: 50 }), // 'actively_looking', 'open_to_offers', 'not_available'
  workFlexibility: text("work_flexibility").array(), // ['onsite', 'remote']
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Applications
export const applications = pgTable("applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  coverLetter: text("cover_letter"),
  resumeUrl: varchar("resume_url", { length: 500 }),
  status: applicationStatusEnum("status").default('submitted').notNull(),
  score: integer("score").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Messages (for company-talent communication)
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => applications.id, { onDelete: 'cascade' }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Saved jobs
export const savedJobs = pgTable("saved_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Saved searches
export const savedSearches = pgTable("saved_searches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  filters: jsonb("filters").notNull(),
  alertFrequency: alertFrequencyEnum("alert_frequency"),
  lastAlertSent: timestamp("last_alert_sent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Plans (pricing tiers for job postings)
export const plans = pgTable("plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  tier: jobTierEnum("tier").notNull(),
  visibilityDays: integer("visibility_days").notNull(),
  price: integer("price").notNull(),
  credits: integer("credits").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payments
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  planId: varchar("plan_id").references(() => plans.id),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }).unique(),
  amount: integer("amount").notNull(),
  status: varchar("status", { length: 50 }).default('pending').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Credit ledger (tracks employer credits for job postings)
export const creditLedger = pgTable("credit_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  tier: jobTierEnum("tier").notNull(),
  amount: integer("amount").notNull(),
  balance: integer("balance").notNull(),
  reason: varchar("reason", { length: 255 }),
  paymentId: varchar("payment_id").references(() => payments.id),
  jobId: varchar("job_id").references(() => jobs.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  talentProfile: one(talentProfiles, {
    fields: [users.id],
    references: [talentProfiles.userId],
  }),
  companyMembers: many(companyMembers),
  applications: many(applications),
  savedJobs: many(savedJobs),
  savedSearches: many(savedSearches),
  payments: many(payments),
  creditLedger: many(creditLedger),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  members: many(companyMembers),
  jobs: many(jobs),
}));

export const companyMembersRelations = relations(companyMembers, ({ one }) => ({
  company: one(companies, {
    fields: [companyMembers.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [companyMembers.userId],
    references: [users.id],
  }),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  company: one(companies, {
    fields: [jobs.companyId],
    references: [companies.id],
  }),
  applications: many(applications),
  savedBy: many(savedJobs),
}));

export const talentProfilesRelations = relations(talentProfiles, ({ one }) => ({
  user: one(users, {
    fields: [talentProfiles.userId],
    references: [users.id],
  }),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  job: one(jobs, {
    fields: [applications.jobId],
    references: [jobs.id],
  }),
  user: one(users, {
    fields: [applications.userId],
    references: [users.id],
  }),
}));

export const savedJobsRelations = relations(savedJobs, ({ one }) => ({
  user: one(users, {
    fields: [savedJobs.userId],
    references: [users.id],
  }),
  job: one(jobs, {
    fields: [savedJobs.jobId],
    references: [jobs.id],
  }),
}));

export const savedSearchesRelations = relations(savedSearches, ({ one }) => ({
  user: one(users, {
    fields: [savedSearches.userId],
    references: [users.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  plan: one(plans, {
    fields: [payments.planId],
    references: [plans.id],
  }),
}));

export const creditLedgerRelations = relations(creditLedger, ({ one }) => ({
  user: one(users, {
    fields: [creditLedger.userId],
    references: [users.id],
  }),
  payment: one(payments, {
    fields: [creditLedger.paymentId],
    references: [payments.id],
  }),
  job: one(jobs, {
    fields: [creditLedger.jobId],
    references: [jobs.id],
  }),
}));

// Insert schemas and types
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const upsertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true });

export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCompanyMemberSchema = createInsertSchema(companyMembers).omit({ id: true, createdAt: true });
export const insertJobSchema = createInsertSchema(jobs).omit({ id: true, createdAt: true, updatedAt: true, viewCount: true, applyCount: true });
export const insertTalentProfileSchema = createInsertSchema(talentProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertApplicationSchema = createInsertSchema(applications).omit({ id: true, createdAt: true, updatedAt: true, score: true });
export const insertSavedJobSchema = createInsertSchema(savedJobs).omit({ id: true, createdAt: true });
export const insertSavedSearchSchema = createInsertSchema(savedSearches).omit({ id: true, createdAt: true, lastAlertSent: true });
export const insertPlanSchema = createInsertSchema(plans).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCreditLedgerSchema = createInsertSchema(creditLedger).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });

// Inferred types
export type User = typeof users.$inferSelect;
export type PublicUser = Omit<User, "passwordHash">;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type CompanyMember = typeof companyMembers.$inferSelect;
export type InsertCompanyMember = z.infer<typeof insertCompanyMemberSchema>;

export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;

export type TalentProfile = typeof talentProfiles.$inferSelect;
export type InsertTalentProfile = z.infer<typeof insertTalentProfileSchema>;

export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type UpdateApplication = Partial<Omit<InsertApplication, 'userId' | 'jobId'>>;

export type SavedJob = typeof savedJobs.$inferSelect;
export type InsertSavedJob = z.infer<typeof insertSavedJobSchema>;

export type SavedSearch = typeof savedSearches.$inferSelect;
export type InsertSavedSearch = z.infer<typeof insertSavedSearchSchema>;

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type CreditLedger = typeof creditLedger.$inferSelect;
export type InsertCreditLedger = z.infer<typeof insertCreditLedgerSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
