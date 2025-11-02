const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { googleIdToUuid, isValidUuid } = require('../utils/uuid-helpers');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// Initialize Supabase client for server-side operations
const supabase = supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * Middleware to verify JWT tokens from NextAuth or Supabase
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

    // Try NextAuth secret first, then Supabase
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;
    const supabaseSecret = process.env.SUPABASE_JWT_SECRET;
    
    if (!nextAuthSecret && !supabaseSecret) {
      console.error('No JWT secret configured');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }

    let decoded;
    let tokenType = 'unknown';
    
    // Try NextAuth token first
    if (nextAuthSecret) {
      try {
        decoded = jwt.verify(token, nextAuthSecret);
        tokenType = 'nextauth';
        console.log(`✅ NextAuth token verified for user: ${decoded.email || decoded.sub}`);
      } catch (err) {
        // Not a NextAuth token, try Supabase
        console.log('⚠️  Not a NextAuth token, trying Supabase...');
      }
    }
    
    // Try Supabase token if NextAuth failed
    if (!decoded && supabaseSecret) {
      try {
        decoded = jwt.verify(token, supabaseSecret);
        tokenType = 'supabase';
        console.log(`✅ Supabase token verified for user: ${decoded.email || decoded.sub}`);
      } catch (err) {
        console.error('❌ Token verification failed:', err.message);
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }
    }
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Extract user info from token (works for both NextAuth and Supabase)
    let userId = decoded.sub || decoded.userId || decoded.id;
    const email = decoded.email;

    if (!userId) {
      console.error('No userId in token:', { tokenType, decoded: { ...decoded, exp: undefined, iat: undefined } });
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload - missing user ID'
      });
    }

    // Convert OAuth ID to UUID if needed (for Google OAuth IDs that aren't UUIDs)
    if (!isValidUuid(userId)) {
      console.log(`Converting OAuth ID ${userId} to UUID`);
      userId = googleIdToUuid(userId);
      console.log(`Converted to UUID: ${userId}`);
    }

    // Check if user profile exists, create if not (using Supabase)
    if (!supabase) {
      console.error('⚠️  Supabase client not initialized - skipping user profile check');
      // Continue without profile - just attach basic user info
      req.user = {
        id: userId,
        email: email,
        name: decoded.name || null,
        avatarUrl: decoded.avatar_url || null,
        dailyBudgetCents: 200
      };
      return next();
    }

    try {
      const { data: existingProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine
        console.error('Error fetching user profile:', fetchError);
      }

      let userProfile = existingProfile;

      if (!userProfile) {
        // Create user profile on first API call
        const { data: newProfile, error } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            email: email,
            name: decoded.name || decoded.user_metadata?.name || null,
            avatar_url: decoded.avatar_url || decoded.user_metadata?.avatar_url || null
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating user profile:', error);
          // Continue anyway - profile creation is non-critical
        } else {
          userProfile = newProfile;
          console.log(`Created new user profile for ${email}`);
        }
      }

      // Attach user info to request
      req.user = {
        id: userId,
        email: email,
        name: userProfile?.name || decoded.name || null,
        avatarUrl: userProfile?.avatar_url || decoded.avatar_url || null,
        dailyBudgetCents: userProfile?.daily_budget_cents || 200
      };
    } catch (profileError) {
      console.error('User profile operation failed:', profileError);
      // Continue with basic user info even if profile ops fail
      req.user = {
        id: userId,
        email: email,
        name: decoded.name || null,
        avatarUrl: decoded.avatar_url || null,
        dailyBudgetCents: 200
      };
    }

    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
