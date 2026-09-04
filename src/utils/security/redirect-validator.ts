/**
 * Secure URL validation utilities for redirect functionality
 * Implements industry-standard security practices for preventing open redirects
 */

export interface RedirectValidationOptions {
  allowedOrigins?: string[];
  allowedPaths?: string[];
  requireAuth?: boolean;
  maxLength?: number;
}

/**
 * Default security configuration for redirects
 */
const DEFAULT_OPTIONS: RedirectValidationOptions = {
  allowedOrigins: [], // Empty means allow current origin only
  allowedPaths: [
    '/dashboard/super-admin',
    '/dashboard/school',
    '/dashboard/teacher',
    '/dashboard/student',
    '/dashboard/student/school-suspended',
    '/dashboard/school/reactivate',
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password'
  ],
  requireAuth: false,
  maxLength: 2048
};

/**
 * Validates if a URL is safe for redirect
 * Implements multiple layers of security checks
 */
export function validateRedirectUrl(
  url: string | null,
  options: RedirectValidationOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 1. Null/undefined check
  if (!url || typeof url !== 'string') {
    return getDefaultRedirect(opts);
  }

  // 2. Length validation (prevent buffer overflow attacks)
  if (url.length > (opts.maxLength || 2048)) {
    return getDefaultRedirect(opts);
  }

  // 3. Basic format validation
  if (!isValidUrlFormat(url)) {
    return getDefaultRedirect(opts);
  }

  // 4. Parse and validate URL components
  try {
    const parsedUrl = new URL(url, window.location.origin);
    
    // 5. Origin validation (prevent open redirects)
    if (!isValidOrigin(parsedUrl.origin, opts.allowedOrigins || [])) {
      return getDefaultRedirect(opts);
    }

    // 6. Path validation (whitelist approach)
    if (!isValidPath(parsedUrl.pathname, opts.allowedPaths || [])) {
      return getDefaultRedirect(opts);
    }

    // 7. Protocol validation
    if (!isValidProtocol(parsedUrl.protocol)) {
      return getDefaultRedirect(opts);
    }

    // 8. Additional security checks
    if (containsSuspiciousPatterns(url)) {
      return getDefaultRedirect(opts);
    }

    // Return the safe, validated URL
    return parsedUrl.pathname + parsedUrl.search;
    
  } catch (error) {
    // URL parsing failed - treat as suspicious
    return getDefaultRedirect(opts);
  }
}

/**
 * Checks if URL format is valid
 */
function isValidUrlFormat(url: string): boolean {
  // Reject obvious malformed URLs
  if (url.includes('..') || url.includes('\\\\') || url.includes('//')) {
    return false;
  }
  
  // Must start with / or be a relative path
  return url.startsWith('/') || !url.includes('://');
}

/**
 * Validates the origin against allowed origins
 */
function isValidOrigin(origin: string, allowedOrigins: string[]): boolean {
  // If no specific origins allowed, only allow current origin
  if (allowedOrigins.length === 0) {
    return origin === window.location.origin;
  }
  
  return allowedOrigins.includes(origin);
}

/**
 * Validates the path against allowed paths
 */
function isValidPath(pathname: string, allowedPaths: string[]): boolean {
  // Exact match
  if (allowedPaths.includes(pathname)) {
    return true;
  }
  
  // Prefix match (for nested paths)
  return allowedPaths.some(allowed => pathname.startsWith(allowed));
}

/**
 * Validates the protocol
 */
function isValidProtocol(protocol: string): boolean {
  const allowedProtocols = ['http:', 'https:'];
  return allowedProtocols.includes(protocol);
}

/**
 * Checks for suspicious patterns that might indicate attacks
 */
function containsSuspiciousPatterns(url: string): boolean {
  const suspiciousPatterns = [
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /file:/i,
    /ftp:/i,
    /<script/i,
    /onload=/i,
    /onerror=/i,
    /onclick=/i,
    /%3Cscript/i, // URL encoded <script>
    /%3E/i,      // URL encoded >
    /&#60;/i,    // HTML encoded <
    /&#62;/i     // HTML encoded >
  ];

  return suspiciousPatterns.some(pattern => pattern.test(url));
}

/**
 * Returns the default redirect URL based on user context
 */
function getDefaultRedirect(options: RedirectValidationOptions): string {
  // In a real implementation, you might check user role here
  // For now, return a safe default
  return '/dashboard/super-admin';
}

/**
 * Creates a safe return-to URL parameter
 */
export function createReturnToUrl(destination: string): string {
  const validatedUrl = validateRedirectUrl(destination);
  return `/auth/login?return-to=${encodeURIComponent(validatedUrl)}`;
}

/**
 * Extracts and validates return-to parameter from current URL
 */
export function getReturnToParameter(): string | null {
  if (typeof window === 'undefined') return null;
  
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get('return-to');
  
  if (!returnTo) return null;
  
  const validated = validateRedirectUrl(returnTo);
  
  // Return null if validation failed (fallback to default)
  return validated === getDefaultRedirect({}) ? null : validated;
}

/**
 * Role-based redirect destinations
 */
export const ROLE_BASED_REDIRECTS = {
  SUPER_ADMIN: '/dashboard/super-admin',
  SCHOOL_ADMIN: '/dashboard/school',
  TEACHER: '/dashboard/teacher',
  STUDENT: '/dashboard/student'
} as const;

/**
 * Gets role-appropriate default redirect
 */
export function getRoleBasedRedirect(userRole: string): string {
  return ROLE_BASED_REDIRECTS[userRole as keyof typeof ROLE_BASED_REDIRECTS] || '/dashboard';
}

/**
 * Comprehensive security check for production use
 */
export function performSecurityAudit(url: string): {
  isValid: boolean;
  issues: string[];
  sanitizedUrl: string;
} {
  const issues: string[] = [];
  
  // Check for common vulnerabilities
  if (url.includes('..')) issues.push('Path traversal attempt');
  if (url.includes('javascript:')) issues.push('JavaScript injection attempt');
  if (url.includes('<script')) issues.push('Script tag injection');
  if (url.length > 2048) issues.push('URL length exceeds safe limit');
  
  try {
    new URL(url, window.location.origin);
  } catch {
    issues.push('Invalid URL format');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    sanitizedUrl: validateRedirectUrl(url)
  };
}
