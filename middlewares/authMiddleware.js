// Simple role authorization middleware
// In production, verify JWT header. Here we allow mock role headers or token verification for clean testing.

export const requireAuth = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role']; // 'VENDOR', 'CMS_ADMIN', 'CUSTOMER'

  if (!userId || !userRole) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized: Missing x-user-id or x-user-role header' });
  }

  req.user = { id: userId, role: userRole };
  next();
};

export const requireRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: `Forbidden: Requires role ${roles.join(' or ')}` });
    }
    next();
  };
};
