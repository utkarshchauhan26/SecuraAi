/**
 * Input validation middleware using Zod
 * Validates request body, params, and query against schemas
 */
const { z } = require('zod');

// ============================================================
// Validation Schemas
// ============================================================

// Repository URL schema - validates GitHub/GitLab/Bitbucket URLs
const repoUrlSchema = z.object({
  repoUrl: z
    .string({ required_error: 'Repository URL is required' })
    .url('Must be a valid URL')
    .regex(
      /^https?:\/\/(github\.com|gitlab\.com|bitbucket\.org)\/.+\/.+/i,
      'Must be a valid GitHub, GitLab, or Bitbucket repository URL'
    )
    .max(500, 'URL too long'),
  scanType: z
    .enum(['fast', 'deep'], { 
      errorMap: () => ({ message: 'Scan type must be "fast" or "deep"' })
    })
    .default('fast')
});

// Scan ID parameter schema
const scanIdSchema = z.object({
  scanId: z
    .string({ required_error: 'Scan ID is required' })
    .uuid('Invalid scan ID format')
});

// Report generation schema
const reportSchema = z.object({
  scanId: z
    .string({ required_error: 'Scan ID is required' })
    .uuid('Invalid scan ID format'),
  format: z
    .enum(['pdf', 'json'], {
      errorMap: () => ({ message: 'Format must be "pdf" or "json"' })
    })
    .default('pdf')
    .optional(),
  includeAI: z
    .boolean()
    .default(true)
    .optional()
});

// GitHub repo input schema  
const githubRepoSchema = z.object({
  owner: z
    .string({ required_error: 'Repository owner is required' })
    .min(1, 'Owner cannot be empty')
    .max(100, 'Owner name too long')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Invalid owner name format'),
  repo: z
    .string({ required_error: 'Repository name is required' })
    .min(1, 'Repo name cannot be empty')
    .max(100, 'Repo name too long')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Invalid repo name format'),
  branch: z
    .string()
    .max(200, 'Branch name too long')
    .regex(/^[a-zA-Z0-9_./-]+$/, 'Invalid branch name format')
    .default('main')
    .optional()
});

// Pagination query schema
const paginationSchema = z.object({
  page: z.coerce
    .number()
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .default(1)
    .optional(),
  limit: z.coerce
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20)
    .optional()
});

// ============================================================
// Validation Middleware Factory
// ============================================================

/**
 * Creates validation middleware for the specified schema and request property
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {'body'|'params'|'query'} property - Request property to validate
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req[property]);
      
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors
        });
      }
      
      // Replace request data with validated & transformed data
      req[property] = result.data;
      next();
    } catch (error) {
      console.error('Validation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal validation error'
      });
    }
  };
};

// ============================================================
// Sanitization Helpers
// ============================================================

/**
 * Sanitize string - strip HTML tags and trim whitespace
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '').trim();
};

/**
 * Middleware that sanitizes all string values in req.body
 */
const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        req.body[key] = sanitizeString(value);
      }
    }
  }
  next();
};

// ============================================================
// Exports
// ============================================================

module.exports = {
  // Schemas
  repoUrlSchema,
  scanIdSchema,
  reportSchema,
  githubRepoSchema,
  paginationSchema,
  
  // Middleware
  validate,
  sanitizeBody,
  sanitizeString
};
