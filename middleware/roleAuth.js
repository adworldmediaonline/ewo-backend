const roleAuth = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user exists on request (should be set by auth middleware)
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Check if user has role property
      if (!req.user.role) {
        return res.status(403).json({
          success: false,
          message: 'User role not found',
        });
      }

      // Check if user's role is in the allowed roles
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        });
      }

      // User has required role, proceed
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error checking user role',
        error: error.message,
      });
    }
  };
};

export default roleAuth;
