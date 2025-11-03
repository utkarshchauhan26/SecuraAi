// Workaround: Use Supabase client for authentication instead of Prisma
const { createClient } = require('@supabase/supabase-js');
const { googleIdToUuid, isValidUuid } = require('../utils/uuid-helpers');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Alternative auth middleware using Supabase client
 */
async function requireAuthSupabase(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    console.log('🔐 Auth check - Headers:', {
      hasAuth: !!authHeader,
      authPreview: authHeader ? authHeader.substring(0, 20) + '...' : 'none'
    });
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Missing or invalid authorization header');
      return res.status(401).json({
        success: false,
        message: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7);
    
    // Try to verify JWT token
    const jwt = require('jsonwebtoken');
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;
    
    console.log('🔑 Verifying JWT token...', {
      hasSecret: !!nextAuthSecret,
      secretLength: nextAuthSecret?.length,
      tokenLength: token.length
    });
    
    let decoded;
    try {
      decoded = jwt.verify(token, nextAuthSecret);
      console.log('✅ Token verified successfully:', {
        sub: decoded.sub,
        email: decoded.email,
        userId: decoded.userId
      });
    } catch (err) {
      console.log('❌ Token verification failed:', err.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: err.message
      });
    }

    let userId = decoded.sub || decoded.userId || decoded.id;
    const email = decoded.email;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload - missing user ID'
      });
    }

    // Convert Google OAuth ID to proper UUID if needed
    if (!isValidUuid(userId)) {
      console.log(`Converting OAuth ID ${userId} to UUID`);
      userId = googleIdToUuid(userId);
      console.log(`Converted to UUID: ${userId}`);
    }

    // Use Supabase client instead of Prisma
    let { data: userProfile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Supabase error:', error);
    }

    if (!userProfile) {
      // Create user profile using Supabase
      const { data: newUser, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: email,
          name: decoded.name || null,
          avatar_url: decoded.avatar_url || decoded.picture || null
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        // Continue with basic user info even if DB create fails
        userProfile = {
          id: userId,
          email: email,
          name: decoded.name,
          avatar_url: decoded.picture,
          daily_budget_cents: 200
        };
      } else {
        userProfile = newUser;
        console.log(`Created new user profile for ${email} via Supabase`);
      }
    }

    // Attach user info to request
    req.user = {
      id: userId,
      email: email,
      name: userProfile.name,
      avatarUrl: userProfile.avatar_url,
      dailyBudgetCents: userProfile.daily_budget_cents || 200
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

module.exports = { requireAuthSupabase };