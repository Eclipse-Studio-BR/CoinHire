import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import pgSession from "connect-pg-simple";
import cors from "cors";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Behind Railway/Proxy
app.set("trust proxy", 1);

// Allow your Vercel site (and local dev) to call the API
app.use(
  cors({
    origin: [
      "https://*.vercel.app",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);

// Sessions BEFORE routes
const PgSession = pgSession(session);
app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "sessions",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  })
);

// Raw body (e.g., Stripe) + JSON body
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false }));

// Serve uploaded files (note: Railway has no persistent disk for prod)
app.use("/uploads", express.static("uploads"));

// Track user activity (update lastActiveAt)
app.use(async (req, res, next) => {
  if (req.session?.userId) {
    // Only update every 2 minutes to reduce database load
    const now = new Date();
    const lastUpdate = (req.session as any).lastActivityUpdate;
    
    if (!lastUpdate || now.getTime() - new Date(lastUpdate).getTime() > 120000) {
      (req.session as any).lastActivityUpdate = now.toISOString();
      
      // Update user's lastActiveAt in background (don't wait)
      pool.query(
        'UPDATE users SET last_active_at = $1 WHERE id = $2',
        [now, req.session.userId]
      ).catch(err => console.error('Failed to update user activity:', err));
      
      // Also update talent profile if exists
      pool.query(
        'UPDATE talent_profiles SET last_active_at = $1 WHERE user_id = $2',
        [now, req.session.userId]
      ).catch(err => console.error('Failed to update talent profile activity:', err));
    }
  }
  next();
});

// Request logging for /api (with safe typing)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalJson = res.json as unknown as (...args: any[]) => Response;
  (res as any).json = function (body: any, ...args: any[]) {
    capturedJsonResponse = body;
    return originalJson.call(this, body, ...args);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

// Simple health endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

(async () => {
  const server = await registerRoutes(app);

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    console.error(err);
  });

  // Vite only in development; static in prod
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Bind to 0.0.0.0 so Railway can reach your server
  const defaultPort = process.env.REPL_ID ? "5000" : "3000";
  const port = parseInt(process.env.PORT || defaultPort, 10);
  const host = "0.0.0.0";

  const listenOptions: { port: number; host: string; reusePort?: boolean } = {
    port,
    host,
  };
  if (process.env.REPL_ID) listenOptions.reusePort = true;

  server.listen(listenOptions, () => {
    log(`serving on port ${port}`);
  });
})();
