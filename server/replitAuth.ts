import * as openidClient from 'openid-client';
import type { Express, Request, Response, NextFunction } from 'express';
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users } from "@shared/schema";
import "./types";

const ISSUER_URL = process.env.ISSUER_URL || 'https://replit.com/oidc';

let config: openidClient.Configuration;

export async function setupReplitAuth(app: Express) {
  const replId = process.env.REPL_ID;
  const replitDomains = process.env.REPLIT_DOMAINS;

  if (!replId || !replitDomains) {
    console.warn('Missing REPL_ID or REPLIT_DOMAINS - auth will not work properly');
    return;
  }

  const domain = replitDomains.split(',')[0];
  const redirectUri = `https://${domain}/api/callback`;

  // Discover the configuration
  config = await openidClient.discovery(new URL(ISSUER_URL), replId);

  // Login route
  app.get('/api/login', async (req: Request, res: Response) => {
    const codeVerifier = openidClient.randomPKCECodeVerifier();
    const codeChallenge = await openidClient.calculatePKCECodeChallenge(codeVerifier);
    const state = openidClient.randomState();

    req.session.codeVerifier = codeVerifier;
    req.session.state = state;

    const authUrl = openidClient.buildAuthorizationUrl(config, {
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      redirect_uri: redirectUri,
      scope: 'openid profile email',
      state,
    });

    res.redirect(authUrl.href);
  });

  // Callback route
  app.get('/api/callback', async (req: Request, res: Response) => {
    try {
      const { codeVerifier, state } = req.session;

      if (!codeVerifier || !state) {
        return res.redirect('/');
      }

      const tokens = await openidClient.authorizationCodeGrant(config, new URL(req.url!, `https://${domain}`), {
        pkceCodeVerifier: codeVerifier,
        expectedState: state,
      });

      const claims = tokens.claims();

      if (!claims) {
        return res.redirect('/');
      }

      // Find or create user
      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, claims.sub));

      if (!user) {
        [user] = await db
          .insert(users)
          .values({
            id: claims.sub,
            email: claims.email as string,
            firstName: (claims.given_name as string) || (claims.name as string)?.split(' ')[0],
            lastName: (claims.family_name as string) || (claims.name as string)?.split(' ').slice(1).join(' '),
            profileImageUrl: claims.picture as string || null,
            role: 'guest', // Require role selection
          })
          .returning();
      }

      req.session.userId = user.id;

      res.redirect('/');
    } catch (error) {
      console.error('Auth callback error:', error);
      res.redirect('/');
    }
  });

  // Logout route
  app.get('/api/logout', (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.redirect('/');
    });
  });

  // Get current user
  app.get('/api/auth/user', async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  });

  // Select role (first-time onboarding only)
  app.post('/api/auth/select-role', async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get current user
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId));

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only allow role selection for users with 'guest' role (first-time onboarding)
    if (currentUser.role !== 'guest') {
      return res.status(403).json({ error: 'Role already set. Please contact support to change your role.' });
    }

    const { role } = req.body;

    if (!['talent', 'employer', 'recruiter'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const [user] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, req.session.userId))
      .returning();

    res.json(user);
  });
}

// Middleware to require authentication
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Middleware to require specific role
export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId));

    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}
