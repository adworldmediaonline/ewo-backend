import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../lib/auth.js';

export const betterAuthMiddleware = async (req, res, next) => {
  try {
    // Extract session from better-auth
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Attach user info to req.user for compatibility
    req.user = session.user;
    req.session = { user: session.user };

    next();
  } catch (error) {
    console.error('Better-auth middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};
