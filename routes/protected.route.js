import express from 'express';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Test route 1: Protected route that requires authentication
router.get('/admin', requireAuth, (req, res) => {
  console.log('✅ Protected route accessed by:', req.user.email);

  res.json({
    success: true,
    message: 'Welcome to the protected area!',
    data: {
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
      },
      session: {
        id: req.session.id,
        createdAt: req.session.createdAt,
        expiresAt: req.session.expiresAt,
      },
      // timestamp: new Date().toISOString(),
    },
  });
});

// Test route 2: Public route that shows different content based on auth status
router.get('/public', optionalAuth, (req, res) => {
  if (req.user) {
    console.log(
      '✅ Public route accessed by authenticated user:',
      req.user.email
    );
    res.json({
      success: true,
      message: 'Hello authenticated user!',
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
        },
        isAuthenticated: true,
        timestamp: new Date().toISOString(),
      },
    });
  } else {
    console.log('ℹ️ Public route accessed by anonymous user');
    res.json({
      success: true,
      message: 'Hello anonymous user!',
      data: {
        isAuthenticated: false,
        message: 'You can access this route without authentication',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// Test route 3: Admin-only route (requires specific role)
router.get('/admin', requireAuth, (req, res) => {
  console.log(
    '🔐 Admin route accessed by:',
    req.user.email,
    'Role:',
    req.user.role
  );

  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions',
      message: 'Admin access required',
      code: 'FORBIDDEN',
    });
  }

  res.json({
    success: true,
    message: 'Welcome to the admin area!',
    data: {
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
      },
      adminData: {
        secretMessage: 'This is admin-only content',
        systemInfo: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
        },
      },
      timestamp: new Date().toISOString(),
    },
  });
});

// Test route 4: User profile route
router.get('/profile', requireAuth, (req, res) => {
  console.log('👤 Profile route accessed by:', req.user.email);

  res.json({
    success: true,
    message: 'User profile retrieved successfully',
    data: {
      profile: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        createdAt: req.user.createdAt,
        updatedAt: req.user.updatedAt,
      },
      session: {
        id: req.session.id,
        createdAt: req.session.createdAt,
        expiresAt: req.session.expiresAt,
        userAgent: req.session.userAgent,
      },
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
