import type { Express, NextFunction, Request, Response } from "express";
import { db, pool } from "./db";
import { users, applicationMethodEnum, salaryPeriodEnum, type PublicUser, type User } from "@shared/schema";
import { eq } from "drizzle-orm";
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { z } from "zod";
import "./types";
import { storage } from "./storage";
import { generateUniqueCompanySlug } from "./utils/slug";

const scrypt = promisify(_scrypt);
const selectableRoles = ["talent", "employer", "recruiter"] as const;
type SelectableRole = typeof selectableRoles[number];

const passwordPolicySchema = z
  .string()
  .min(8, "Password must contain at least 8 characters")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[a-z]/, "Include at least one lowercase letter")
  .regex(/[0-9]/, "Include at least one number");

function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

let ensureSchemaPromise: Promise<void> | null = null;

async function ensureAuthSchema(): Promise<void> {
  if (ensureSchemaPromise) {
    return ensureSchemaPromise;
  }

  ensureSchemaPromise = (async () => {
    const client = await pool.connect();
    try {
      const columnsRes = await client.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`,
      );
      const columns = new Set(columnsRes.rows.map((row) => row.column_name));

      if (!columns.has("username")) {
        await client
          .query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" varchar(50)`)
          .catch(() => {
            /* ignore failures */
          });
      }

      if (!columns.has("password_hash")) {
        await client
          .query(
            `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" varchar(255)`,
          )
          .catch(() => {
            /* ignore failures */
          });
      }

      await client
        .query(
          `CREATE UNIQUE INDEX IF NOT EXISTS "users_username_unique_idx" ON "users" ("username") WHERE "username" IS NOT NULL`,
        )
        .catch(() => {
          /* ignore failures */
        });

      await client
        .query(
          `CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" (LOWER("email"))`,
        )
        .catch(() => {
          /* ignore failures */
        });

      await client
        .query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'guest'`)
        .catch(() => {
          /* ignore failures */
        });

      const usersMissingEmail = await client.query<{ id: string }>(
        `SELECT id FROM "users" WHERE "email" IS NULL OR "email" = ''`,
      );
      for (const row of usersMissingEmail.rows) {
        await client
          .query(`UPDATE "users" SET "email" = $1 WHERE "id" = $2`, [
            `user+${row.id}@placeholder.local`,
            row.id,
          ])
          .catch(() => {
            /* ignore failures */
          });
      }

      const usersMissingPassword = await client.query<{ id: string }>(
        `SELECT id FROM "users" WHERE "password_hash" IS NULL OR "password_hash" = '' LIMIT 500`,
      );
      for (const row of usersMissingPassword.rows) {
        const randomPassword = randomBytes(32).toString("hex");
        const hashed = await hashPassword(randomPassword);
        await client
          .query(`UPDATE "users" SET "password_hash" = $1 WHERE "id" = $2`, [
            hashed,
            row.id,
          ])
          .catch(() => {
            /* ignore failures */
          });
      }

      await client
        .query(`ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL`)
        .catch(() => {
          /* ignore failures */
        });
      await client
        .query(`ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL`)
        .catch(() => {
          /* ignore failures */
        });
    } finally {
      client.release();
    }
  })();

  try {
    await ensureSchemaPromise;
  } catch (error) {
    ensureSchemaPromise = null;
    throw error;
  }
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash || !storedHash.includes(":")) {
    return false;
  }

  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const storedKey = Buffer.from(hash, "hex");

  if (storedKey.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedKey, derivedKey);
}

function sanitizeIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

function toCommaSeparatedList(value?: string | string[]): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((entry) => entry.trim()).filter(Boolean);
  }
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function findCredentialConflict(email: string, username?: string): Promise<"email" | "username" | null> {
  const normalizedEmail = sanitizeIdentifier(email);
  const [existingByEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail));
  if (existingByEmail) {
    return "email";
  }

  if (username) {
    const normalizedUsername = sanitizeIdentifier(username);
    const [existingByUsername] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, normalizedUsername));
    if (existingByUsername) {
      return "username";
    }
  }

  return null;
}

async function setSessionUser(req: Request, userId: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    req.session.userId = userId;
    req.session.save((saveErr) => {
      if (saveErr) return reject(saveErr);
      resolve();
    });
  });
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters long")
    .max(30, "Username must be at most 30 characters long")
    .regex(/^[a-z0-9._-]+$/i, "Username can contain letters, numbers, dot, underscore, and hyphen")
    .optional()
    .transform((value) => value?.toLowerCase()),
});

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

const adminLoginSchema = z.object({
  email: z.string().email("Admin email is required"),
  password: z.string().min(1, "Password is required"),
});

const updateProfileSchema = z
  .object({
    firstName: z.string().trim().max(100, "First name must be 100 characters or less").optional(),
    lastName: z.string().trim().max(100, "Last name must be 100 characters or less").optional(),
    profileImageUrl: z.string().trim().max(500, "Profile image path is too long").optional(),
    resumePath: z.string().trim().max(500, "Resume path is too long").optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field is required to update your profile",
  });

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters long"),
});

const usernameFieldSchema = z
  .string()
  .min(3, "Username must be at least 3 characters long")
  .max(30, "Username must be at most 30 characters long")
  .regex(/^[a-z0-9._-]+$/i, "Username can contain letters, numbers, dot, underscore, and hyphen")
  .optional()
  .or(z.literal(""))
  .transform((value) => value?.toLowerCase());

const optionalNumberField = () =>
  z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) {
        return undefined;
      }
      if (typeof val === "string") {
        const parsed = Number(val);
        return Number.isFinite(parsed) ? Math.round(parsed) : val;
      }
      return val;
    },
    z.number().int().min(0).optional(),
  );

const optionalUrlField = () =>
  z
    .string()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value && value.trim().length ? value.trim() : undefined));

const talentRegistrationSchema = z
  .object({
    email: z.string().email(),
    password: passwordPolicySchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    username: usernameFieldSchema,
    firstName: z
      .string()
      .max(100)
      .optional()
      .or(z.literal(""))
      .transform((value) => (value && value.trim().length ? value.trim() : undefined)),
    lastName: z
      .string()
      .max(100)
      .optional()
      .or(z.literal(""))
      .transform((value) => (value && value.trim().length ? value.trim() : undefined)),
    title: z.string().min(2, "Title is required"),
    story: z.string().min(10, "Tell us a bit more about yourself"),
    hourlyRate: optionalNumberField(),
    monthlyRate: optionalNumberField(),
    location: z.string().min(2, "Location is required"),
    timezone: z.string().min(2, "Timezone is required"),
    skills: z
      .string()
      .min(1, "List at least one skill")
      .transform((value) => toCommaSeparatedList(value))
      .refine((list) => list.length > 0, { message: "List at least one skill" }),
    languages: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((value) => toCommaSeparatedList(value)),
    linkedin: optionalUrlField(),
    telegram: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((value) => (value && value.trim().length ? value.trim() : undefined)),
    avatarPath: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((value) => (value && value.trim().length ? value.trim() : undefined)),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

const salaryCurrencySchema = z.enum(["USD", "EUR", "CAD", "GBP"]);
const salaryPeriodSchema = z.enum(salaryPeriodEnum.enumValues);
const applicationMethodSchema = z.enum(applicationMethodEnum.enumValues);

const companyRegistrationSchema = z
  .object({
    email: z.string().email(),
    password: passwordPolicySchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    companyName: z.string().min(2, "Company name is required"),
    jobTitle: z.string().min(2, "Job title is required"),
    companyDescription: z.string().min(20, "Company description is required"),
    jobDescription: z.string().min(20, "Job description is required"),
    jobLocation: z.string().min(2, "Job location is required"),
    salaryMin: optionalNumberField(),
    salaryMax: optionalNumberField(),
    salaryCurrency: salaryCurrencySchema,
    salaryPeriod: salaryPeriodSchema,
    applicationMethod: applicationMethodSchema,
    applicationEmail: z
      .string()
      .email()
      .optional()
      .or(z.literal(""))
      .transform((value) => (value && value.trim().length ? value.trim() : undefined)),
    applicationUrl: optionalUrlField(),
    companyLogoPath: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((value) => (value && value.trim().length ? value.trim() : undefined)),
    website: optionalUrlField(),
    twitter: optionalUrlField(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
    if (data.salaryMin !== undefined && data.salaryMax !== undefined && data.salaryMin > data.salaryMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["salaryMax"],
        message: "Maximum salary must be greater than minimum salary",
      });
    }
    if (data.applicationMethod === "email" && !data.applicationEmail?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["applicationEmail"],
        message: "Application email is required when using email method",
      });
    }
    if (data.applicationMethod === "external" && !data.applicationUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["applicationUrl"],
        message: "Application URL is required for external method",
      });
    }
  });

export function registerAuth(app: Express) {
  app.use(async (_req, _res, next) => {
    try {
      await ensureAuthSchema();
    } catch (error) {
      console.error("Auth schema initialization error:", error);
    }
    next();
  });

  void ensureAuthSchema().catch((error) =>
    console.error("Auth schema initialization error:", error),
  );

  app.post("/api/auth/register/talent", async (req: Request, res: Response) => {
    try {
      const payload = talentRegistrationSchema.parse(req.body);
      const email = sanitizeIdentifier(payload.email);
      const username = payload.username ? sanitizeIdentifier(payload.username) : undefined;

      const conflict = await findCredentialConflict(email, username);
      if (conflict === "email") {
        return res.status(409).json({ error: "An account with this email already exists." });
      }
      if (conflict === "username") {
        return res.status(409).json({ error: "Username already taken." });
      }

      const passwordHash = await hashPassword(payload.password);
      const [user] = await db
        .insert(users)
        .values({
          email,
          username,
          passwordHash,
          firstName: payload.firstName ?? null,
          lastName: payload.lastName ?? null,
          profileImageUrl: payload.avatarPath ?? null,
          role: "talent",
        })
        .returning();

      await storage.createTalentProfile({
        userId: user.id,
        headline: payload.title,
        bio: payload.story,
        skills: payload.skills,
        languages: payload.languages,
        location: payload.location,
        timezone: payload.timezone,
        hourlyRate: payload.hourlyRate ?? null,
        monthlyRate: payload.monthlyRate ?? null,
        portfolioUrl: null,
        githubUrl: null,
        experience: null,
        education: null,
        linkedinUrl: payload.linkedin ?? null,
        telegram: payload.telegram ?? null,
        resumeUrl: null,
        isPublic: true,
      });

      await setSessionUser(req, user.id);
      return res.status(201).json(toPublicUser(user));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.flatten() });
      }
      console.error("Talent registration error:", error);
      return res.status(500).json({ error: "Unable to register talent at this time." });
    }
  });

  app.post("/api/auth/register/company", async (req: Request, res: Response) => {
    try {
      const payload = companyRegistrationSchema.parse(req.body);
      const email = sanitizeIdentifier(payload.email);

      const conflict = await findCredentialConflict(email);
      if (conflict === "email") {
        return res.status(409).json({ error: "An account with this email already exists." });
      }

      const passwordHash = await hashPassword(payload.password);
      const [user] = await db
        .insert(users)
        .values({
          email,
          passwordHash,
          role: "employer",
        })
        .returning();

      const slug = await generateUniqueCompanySlug(payload.companyName);
      const company = await storage.createCompany({
        name: payload.companyName,
        slug,
        description: payload.companyDescription,
        website: payload.website ?? undefined,
        twitter: payload.twitter ?? undefined,
        logo: payload.companyLogoPath ?? undefined,
        location: payload.jobLocation,
        size: undefined,
        isApproved: true,
        isHiring: true,
      });

      await storage.addCompanyMember({
        companyId: company.id,
        userId: user.id,
        isOwner: true,
      });

      await storage.createJob({
        companyId: company.id,
        title: payload.jobTitle,
        description: payload.jobDescription,
        requirements: null,
        responsibilities: null,
        category: null,
        location: payload.jobLocation,
        isRemote: false,
        salaryMin: payload.salaryMin ?? null,
        salaryMax: payload.salaryMax ?? null,
        salaryCurrency: payload.salaryCurrency,
        salaryPeriod: payload.salaryPeriod,
        jobType: 'full_time',
        experienceLevel: 'mid',
        tier: 'normal',
        status: 'pending',
        externalUrl: payload.applicationMethod === 'external' ? payload.applicationUrl ?? null : null,
        applicationMethod: payload.applicationMethod,
        applicationEmail: payload.applicationMethod === 'email' ? payload.applicationEmail ?? null : null,
        tags: [],
        visibilityDays: 30,
      });

      await setSessionUser(req, user.id);
      return res.status(201).json(toPublicUser(user));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.flatten() });
      }

      console.error("Company registration error:", error);
      return res.status(500).json({ error: "Unable to register company at this time." });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const payload = registerSchema.parse(req.body);
      const email = sanitizeIdentifier(payload.email);
      const username = payload.username ? sanitizeIdentifier(payload.username) : undefined;

      const [existingByEmail] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email));
      if (existingByEmail) {
        return res.status(409).json({ error: "An account with this email already exists." });
      }

      if (username) {
        const [existingByUsername] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.username, username));
        if (existingByUsername) {
          return res.status(409).json({ error: "Username already taken." });
        }
      }

      const passwordHash = await hashPassword(payload.password);
      const [user] = await db
        .insert(users)
        .values({
          email,
          username,
          passwordHash,
          firstName: payload.firstName ?? null,
          lastName: payload.lastName ?? null,
          role: "guest",
        })
        .returning();

      await setSessionUser(req, user.id);
      return res.status(201).json(toPublicUser(user));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.flatten() });
      }

      console.error("Registration error:", error);
      return res.status(500).json({ error: "Unable to register at this time." });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { identifier, password } = loginSchema.parse(req.body);
      const normalizedIdentifier = sanitizeIdentifier(identifier);

      const isEmail = normalizedIdentifier.includes("@");
      const [user] = await db
        .select()
        .from(users)
        .where(
          isEmail ? eq(users.email, normalizedIdentifier) : eq(users.username, normalizedIdentifier),
        );

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials." });
      }

      const isPasswordValid = await verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid credentials." });
      }

      // Update last active timestamp on login
      const now = new Date();
      await pool.query('UPDATE users SET last_active_at = $1 WHERE id = $2', [now, user.id]);
      await pool.query('UPDATE talent_profiles SET last_active_at = $1 WHERE user_id = $2', [now, user.id]);

      await setSessionUser(req, user.id);
      return res.json(toPublicUser(user));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.flatten() });
      }

      console.error("Login error:", error);
      return res.status(500).json({ error: "Unable to login at this time." });
    }
  });

  app.post("/api/auth/admin-login", async (req: Request, res: Response) => {
    try {
      if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
        return res.status(500).json({ error: "Admin credentials not configured" });
      }

      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;

      const { email, password } = adminLoginSchema.parse(req.body);
      if (email !== adminEmail || password !== adminPassword) {
        return res.status(401).json({ error: "Invalid admin credentials" });
      }

      let adminUser = await storage.getUserByEmail(email);
      if (!adminUser) {
        const passwordHash = await hashPassword(adminPassword);
        adminUser = await storage.createUser({
          email,
          username: "admin",
          passwordHash,
          firstName: "Admin",
          lastName: "User",
          role: "admin",
        });
      } else if (adminUser.role !== "admin") {
        adminUser = (await storage.updateUser(adminUser.id, { role: "admin" })) ?? adminUser;
      }

      // Update last active timestamp on login
      const now = new Date();
      await pool.query('UPDATE users SET last_active_at = $1 WHERE id = $2', [now, adminUser.id]);
      
      await setSessionUser(req, adminUser.id);
      return res.json(toPublicUser(adminUser));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.flatten() });
      }

      console.error("Admin login error:", error);
      return res.status(500).json({ error: "Unable to login as admin." });
    }
  });

  const destroySession = (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Unable to logout at this time." });
      }
      res.status(204).end();
    });
  };

  app.post("/api/auth/logout", destroySession);
  app.get("/api/logout", destroySession);

  app.get("/api/auth/user", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId));

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(toPublicUser(user));
  });

  app.put("/api/auth/profile", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const payload = updateProfileSchema.parse(req.body);
      const updates: Partial<User> = {
        updatedAt: new Date(),
      };

      if (payload.firstName !== undefined) {
        const trimmed = payload.firstName.trim();
        updates.firstName = trimmed.length ? trimmed : null;
      }

      if (payload.lastName !== undefined) {
        const trimmed = payload.lastName.trim();
        updates.lastName = trimmed.length ? trimmed : null;
      }

      if (payload.profileImageUrl !== undefined) {
        const trimmed = payload.profileImageUrl.trim();
        updates.profileImageUrl = trimmed.length ? trimmed : null;
      }

      if (payload.resumePath !== undefined) {
        const trimmed = payload.resumePath.trim();
        updates.resumePath = trimmed.length ? trimmed : null;
      }

      const [updatedUser] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, req.session.userId))
        .returning();

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.json(toPublicUser(updatedUser));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.flatten() });
      }
      console.error("Profile update error:", error);
      return res.status(500).json({ error: "Unable to update profile at this time." });
    }
  });

  app.put("/api/auth/password", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const payload = changePasswordSchema.parse(req.body);

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.session.userId));

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isCurrentValid = await verifyPassword(payload.currentPassword, user.passwordHash);
      if (!isCurrentValid) {
        return res.status(400).json({ error: "Current password is incorrect." });
      }

      if (payload.currentPassword === payload.newPassword) {
        return res.status(400).json({ error: "The new password must be different from your current password." });
      }

      const passwordHash = await hashPassword(payload.newPassword);
      await db
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, req.session.userId));

      return res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.flatten() });
      }
      console.error("Password change error:", error);
      return res.status(500).json({ error: "Unable to update password at this time." });
    }
  });

  app.post("/api/auth/select-role", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { role } = req.body as { role?: string };

    if (!role || !selectableRoles.includes(role as SelectableRole)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    const nextRole = role as SelectableRole;

    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId));

    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (currentUser.role !== "guest") {
      return res.status(403).json({
        error: "Role already set. Please contact support to change your role.",
      });
    }

    const [updatedUser] = await db
      .update(users)
      .set({ role: nextRole })
      .where(eq(users.id, req.session.userId))
      .returning();

    return res.json(toPublicUser(updatedUser));
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  return next();
}

export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId));

    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    return next();
  };
}
