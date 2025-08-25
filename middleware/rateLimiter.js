import rateLimit from 'express-rate-limit';

// Rate limiter for review submissions
const reviewSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message:
      'Too many review submissions from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req, res) => {
    // Skip rate limiting for trusted IPs (optional)
    const trustedIPs = ['127.0.0.1', '::1'];
    return trustedIPs.includes(req.ip);
  },
  // Remove custom keyGenerator to use default IP-based key generation
  // This properly handles both IPv4 and IPv6 addresses
  handler: (req, res) => {
    console.warn('🚨 Rate limit exceeded for review submission:', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
      path: req.path,
    });

    res.status(429).json({
      success: false,
      message: 'Too many review submissions. Please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

// Rate limiter for feedback form access
const feedbackFormLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message:
      'Too many feedback form requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    const trustedIPs = ['127.0.0.1', '::1'];
    return trustedIPs.includes(req.ip);
  },
  // Remove custom keyGenerator to use default IP-based key generation
  // This properly handles both IPv4 and IPv6 addresses
  handler: (req, res) => {
    console.warn('🚨 Rate limit exceeded for feedback form access:', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
      path: req.path,
    });

    res.status(429).send(`
      <html>
        <head><title>Too Many Requests</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>⚠️ Too Many Requests</h2>
          <p>Please wait a few minutes before trying again.</p>
        </body>
      </html>
    `);
  },
});

// Rate limiter for contact form submissions
const contactSubmissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 contact submissions per hour
  message: {
    success: false,
    message:
      'Too many contact form submissions from this IP. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    const trustedIPs = ['127.0.0.1', '::1'];
    return trustedIPs.includes(req.ip);
  },
  handler: (req, res) => {
    console.warn('🚨 Rate limit exceeded for contact submission:', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
      path: req.path,
      body: req.body?.email || 'unknown email',
    });

    res.status(429).json({
      success: false,
      message:
        'Too many contact submissions. Please wait before submitting again.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

export {
  reviewSubmissionLimiter,
  feedbackFormLimiter,
  contactSubmissionLimiter as contactSubmission,
};
