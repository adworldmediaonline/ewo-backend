import { auth, extractTokenFromHeaders, verifyToken } from '../lib/auth.js';

const verifyTokenMiddleware = async (req, res, next) => {
  try {
    // First try to get session from Better Auth (cookies)
    let session = null;

    try {
      session = await auth.api.getSession({
        headers: req.headers,
      });
    } catch (error) {
      // If cookie-based auth fails, try JWT token
      const token = extractTokenFromHeaders(req.headers);
      if (token) {
        session = await verifyToken(token);
      }
    }

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No valid token provided.',
      });
    }

    // Add user info to request
    req.user = session.user;
    req.session = session;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({
      success: false,
      message: 'Access denied. Invalid token.',
    });
  }
};

export default verifyTokenMiddleware;
