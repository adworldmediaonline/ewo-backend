import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../lib/auth.js';

/**
 * Authentication middleware for protected routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const requireAuth = async (req, res, next) => {
  try {
    // console.log('🔐 Auth middleware - Checking authentication');
    // console.log('🔐 Auth middleware - Headers:', {
    //   cookie: req.headers.cookie,
    //   authorization: req.headers.authorization,
    //   origin: req.headers.origin,
    // });

    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    // console.log(
    //   '🔐 Auth middleware - Session result:',
    //   session ? 'Found' : 'Not found'
    // );

    if (!session) {
      // console.log('❌ Auth middleware - No session found, returning 401');
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please sign in to access this resource',
        code: 'UNAUTHORIZED',
      });
    }

    // Attach user and session to request object for use in route handlers
    req.user = session.user;
    req.session = session.session;

    // console.log('✅ Auth middleware - User authenticated:', {
    //   userId: session.user.id,
    //   email: session.user.email,
    //   name: session.user.name,
    // });

    next();
  } catch (error) {
    // console.error('❌ Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'Failed to verify authentication',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (session) {
      req.user = session.user;
      req.session = session.session;
      console.log('✅ Optional auth - User found:', session.user.email);
    } else {
      console.log('ℹ️ Optional auth - No user session');
    }

    next();
  } catch (error) {
    console.error('❌ Optional auth error:', error);
    // Don't fail the request, just continue without user
    next();
  }
};
