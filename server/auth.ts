import type { Express, NextFunction, Request, Response } from "express";
import { db, pool } from "./db";
import { users, type PublicUser, type User } from "@shared/schema";
import { eq } from "drizzle-orm";
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { z } from "zod";
import "./types";

const scrypt = promisify(_scrypt);
const selectableRoles = ["talent", "employer", "recruiter"] as const;
type SelectableRole = typeof selectableRoles[number];

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
