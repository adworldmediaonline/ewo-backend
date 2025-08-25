import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './auth';

export const authenticateSession = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      res.status(401).json({ message: 'Authentication required' });
    } else {
      next();
    }
  } catch (error) {
    console.error('Error in authentication middleware:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
