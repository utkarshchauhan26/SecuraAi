const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const prisma = require('../lib/prisma');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// Initialize Supabase client for server-side operations
const supabase = supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * Middleware to verify JWT tokens from Supabase Auth
 * Attaches user info to req.user
 */
async function requireAuth(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the JWT token
    const jwtSecret = process.env.SUPABASE_JWT_SECRET || process.env.NEXTAUTH_SECRET;
    
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Extract user info from token
    const userId = decoded.sub || decoded.id;
    const email = decoded.email;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload'
      });
    }

    // Check if user profile exists, create if not
    let userProfile = await prisma.userProfile.findUnique({
      where: { id: userId }
    });

    if (!userProfile) {
      // Create user profile on first API call
      userProfile = await prisma.userProfile.create({
        data: {
          id: userId,
          email: email,
          name: decoded.name || decoded.user_metadata?.name || null,
          avatarUrl: decoded.avatar_url || decoded.user_metadata?.avatar_url || null
        }
      });
      console.log(`Created new user profile for ${email}`);
    }

    // Attach user info to request
    req.user = {
      id: userId,
      email: email,
      name: userProfile.name,
      avatarUrl: userProfile.avatarUrl,
      dailyBudgetCents: userProfile.dailyBudgetCents
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
}

/**
 * Optional auth middleware - attaches user if token present, but doesn't require it
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.SUPABASE_JWT_SECRET || process.env.NEXTAUTH_SECRET;
    
    if (!jwtSecret) {
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);
      const userId = decoded.sub || decoded.id;
      const email = decoded.email;

      if (userId) {
        const userProfile = await prisma.userProfile.findUnique({
          where: { id: userId }
        });

        req.user = {
          id: userId,
          email: email,
          name: userProfile?.name,
          avatarUrl: userProfile?.avatarUrl,
          dailyBudgetCents: userProfile?.dailyBudgetCents || 200
        };
      } else {
        req.user = null;
      }
    } catch (err) {
      req.user = null;
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    req.user = null;
    next();
  }
}

module.exports = { requireAuth, optionalAuth };
