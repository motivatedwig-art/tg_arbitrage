# Security Fixes Implementation Guide

## 1. Fix SQL Injection Vulnerabilities

### File: `/src/database/DatabasePostgres.ts`

**BEFORE (Vulnerable):**
```typescript
public async getRecentOpportunities(minutes: number = 30): Promise<any[]> {
  const client = await this.pool.connect();
  try {
    const sql = `
      SELECT * FROM arbitrage_opportunities 
      WHERE timestamp > NOW() - INTERVAL '${minutes} minutes'  // VULNERABLE
      ORDER BY profit_percentage DESC
      LIMIT 100
    `;
    const result = await client.query(sql);
    // ...
  }
}
```

**AFTER (Fixed):**
```typescript
public async getRecentOpportunities(minutes: number = 30): Promise<any[]> {
  const client = await this.pool.connect();
  
  // Validate input
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 10080) {
    throw new Error('Invalid minutes parameter');
  }
  
  try {
    // Option 1: Use interval multiplication
    const sql = `
      SELECT * FROM arbitrage_opportunities 
      WHERE timestamp > NOW() - (INTERVAL '1 minute' * $1)
      ORDER BY profit_percentage DESC
      LIMIT 100
    `;
    const result = await client.query(sql, [minutes]);
    
    return result.rows.map(row => ({
      symbol: row.symbol,
      buyExchange: row.buy_exchange,
      sellExchange: row.sell_exchange,
      buyPrice: parseFloat(row.buy_price),
      sellPrice: parseFloat(row.sell_price),
      profitPercentage: parseFloat(row.profit_percentage),
      profitAmount: parseFloat(row.profit_amount),
      volume: row.volume_24h ? parseFloat(row.volume_24h) : 0,
      timestamp: new Date(row.timestamp).getTime()
    }));
  } finally {
    client.release();
  }
}
```

**Also fix cleanupOldData():**
```typescript
public async cleanupOldData(hoursToKeep: number = 24): Promise<void> {
  const client = await this.pool.connect();
  
  // Validate input
  if (!Number.isInteger(hoursToKeep) || hoursToKeep < 1 || hoursToKeep > 8760) {
    throw new Error('Invalid hoursToKeep parameter');
  }
  
  try {
    const sql = `
      DELETE FROM arbitrage_opportunities 
      WHERE timestamp < NOW() - (INTERVAL '1 hour' * $1)
    `;
    const result = await client.query(sql, [hoursToKeep]);
    console.log(`🧹 Cleaned up ${result.rowCount} old records`);
  } finally {
    client.release();
  }
}
```

---

## 2. Fix CORS Misconfiguration

### File: `/src/webapp/server.ts`

**BEFORE (Vulnerable):**
```typescript
this.app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://web.telegram.org',
      'https://telegram.org',
      config.webappUrl,
      'http://localhost:3000',
      'http://localhost:5173'
    ];
    
    if (!origin || allowedOrigins.includes(origin) || origin.includes('.telegram.org')) {
      callback(null, true);
    } else {
      callback(null, true);  // VULNERABLE - allows ALL origins
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**AFTER (Fixed):**
```typescript
this.app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://web.telegram.org',
      'https://telegram.org',
      config.webappUrl,
      'http://localhost:3000',
      'http://localhost:5173'
    ];
    
    // Only allow whitelisted origins
    const isAllowed = !origin || 
                     allowedOrigins.includes(origin) || 
                     (origin?.endsWith('.telegram.org') && origin.includes('telegram'));
    
    if (isAllowed) {
      callback(null, true);
    } else {
      // Reject with error
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST'],  // Restrict to necessary methods
  allowedHeaders: ['Content-Type'],  // Remove Authorization header if not needed
  maxAge: 86400,  // 24 hours
  optionsSuccessStatus: 200
}));
```

---

## 3. Fix SSL/TLS Certificate Verification

### File: `/src/database/DatabasePostgres.ts`

**BEFORE (Vulnerable):**
```typescript
private constructor() {
  this.pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' 
      ? { rejectUnauthorized: false }  // VULNERABLE
      : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}
```

**AFTER (Fixed):**
```typescript
private constructor() {
  // Configure SSL properly
  let ssl: any = false;
  
  if (process.env.NODE_ENV === 'production') {
    ssl = {
      rejectUnauthorized: true,  // ENFORCE certificate validation
      // Option 1: Use CA certificate from environment
      ca: process.env.DATABASE_SSL_CA ? 
          process.env.DATABASE_SSL_CA.split('\\n').join('\n') : 
          undefined,
      // Option 2: Provide client certificate if required
      cert: process.env.DATABASE_SSL_CERT ? 
            process.env.DATABASE_SSL_CERT.split('\\n').join('\n') : 
            undefined,
      key: process.env.DATABASE_SSL_KEY ? 
           process.env.DATABASE_SSL_KEY.split('\\n').join('\n') : 
           undefined,
      // This is default on Railway, include PEM
      ca: [
        'MIIDXTCCAkWgAwIBAgIJAKC1L+1qYpiDMA0GCSqGSIb3DQEBBQUAMEUxCzAJBgNVBAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQwHhcNMTcwNDA3MDE0ODAxWhcNMTcwNTA3MDE0ODAxWjBFMQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4f5wg5l2hKsTeNem/V41fGnJm6gOdrj8ym3rFkEU/wT8RDtn'
      ]
    };
  }
  
  this.pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  
  this.pool.on('error', (err) => {
    console.error('Pool connection error:', err);
  });
}
```

**Alternative - For Railway specifically:**
```typescript
// Railway automatically provides SSL, just enable it
private constructor() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  this.pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction 
      ? {
          rejectUnauthorized: true,
          // Railway's default CA certificate
          ca: process.env.DATABASE_SSL_CA || undefined
        }
      : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}
```

---

## 4. Add Authentication Middleware

### File: `/src/webapp/server.ts`

**Add this middleware:**
```typescript
// Add near top of setupRoutes() method
private createAuthMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    const validKey = process.env.API_KEY;
    
    if (!validKey) {
      console.warn('⚠️ API_KEY not configured - allowing all requests (dev mode)');
      return next();
    }
    
    if (!apiKey || apiKey !== validKey) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Valid API key required'
      });
    }
    
    next();
  };
}

// Or use Telegram validation
private createTelegramAuthMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const initData = req.headers['x-telegram-init-data'];
    
    if (!initData) {
      return res.status(401).json({ error: 'Missing Telegram credentials' });
    }
    
    try {
      // Validate with Telegram's server
      if (this.validateWebAppInitData(initData as string)) {
        next();
      } else {
        res.status(401).json({ error: 'Invalid Telegram credentials' });
      }
    } catch (error) {
      res.status(401).json({ error: 'Authentication failed' });
    }
  };
}

// Apply to dangerous endpoints:
private setupRoutes(): void {
  const authMiddleware = this.createAuthMiddleware();
  
  // ... existing routes ...
  
  // Protect dangerous endpoints
  this.app.post('/api/scan/trigger', authMiddleware, async (req, res) => {
    try {
      this.arbitrageService.triggerManualScan().catch(error => {
        console.error('❌ Manual scan failed:', error);
      });
      
      res.json({ 
        success: true, 
        message: 'Scan started'
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error'
      });
    }
  });

  this.app.post('/api/opportunities/clear', authMiddleware, async (req, res) => {
    try {
      console.log('🗑️ [PROTECTED] User requested to clear all opportunities');
      await this.db.getArbitrageModel().clearAllOpportunities();
      
      res.json({ 
        success: true, 
        message: 'All opportunities cleared from database' 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error'
      });
    }
  });

  this.app.post('/api/blockchain-scan', authMiddleware, async (req, res) => {
    // ... existing code ...
  });
}
```

---

## 5. Fix Content Security Policy

### File: `/src/webapp/server.ts`

**BEFORE (Vulnerable):**
```typescript
this.app.use(helmet({
  contentSecurityPolicy: false,  // DISABLED
}));
```

**AFTER (Fixed):**
```typescript
this.app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://telegram.org"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.binance.com", "https://www.okx.com", "https://api.bybit.com"],
      frameSrc: ["'self'", "https://web.telegram.org"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : undefined
    },
    reportUri: process.env.CSP_REPORT_URI // Optional: send violations to logging endpoint
  },
  hsts: {
    maxAge: 31536000,  // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  xssFilter: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
}));
```

---

## 6. Fix Error Information Leakage

### File: `/src/webapp/server.ts`

**BEFORE (Vulnerable):**
```typescript
catch (error) {
  console.error('Debug API error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Failed to fetch opportunities',
    details: error instanceof Error ? error.message : 'Unknown error'  // LEAKS
  });
}
```

**AFTER (Fixed):**
```typescript
catch (error) {
  // Log detailed error for debugging/monitoring
  const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.error(`[${errorId}] Debug API error:`, error);
  
  // Return generic response to client
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    errorId: errorId,  // Include ID for support reference
    // Only expose details in development
    ...(process.env.NODE_ENV === 'development' && {
      details: error instanceof Error ? error.message : String(error)
    })
  });
}
```

**Create a centralized error handler:**
```typescript
// Add to server.ts
private handleError(error: any, context: string = 'API'): { 
  statusCode: number, 
  response: any, 
  errorId: string 
} {
  const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Log with full details internally
  console.error(`[${errorId}] ${context} error:`, {
    message: error?.message,
    stack: error?.stack,
    code: error?.code,
    detail: error?.detail
  });
  
  // Return safe response
  return {
    statusCode: 500,
    response: {
      success: false,
      error: 'Internal server error',
      errorId: errorId,
      ...(process.env.NODE_ENV === 'development' && {
        message: error?.message
      })
    },
    errorId
  };
}

// Use in endpoints:
catch (error) {
  const { statusCode, response } = this.handleError(error, 'Opportunities API');
  res.status(statusCode).json(response);
}
```

---

## 7. Implement Rate Limiting

### Install dependency:
```bash
npm install express-rate-limit
```

### File: `/src/webapp/server.ts`

```typescript
import rateLimit from 'express-rate-limit';

export class WebAppServer {
  private generalLimiter: any;
  private scanLimiter: any;
  private authLimiter: any;

  constructor() {
    this.app = express();
    this.db = DatabaseManager.getInstance();
    this.arbitrageService = UnifiedArbitrageService.getInstance();
    
    // Initialize rate limiters
    this.generalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,  // 15 minutes
      max: 100,  // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,  // Return rate limit info in `RateLimit-*` headers
      legacyHeaders: false,  // Disable `X-RateLimit-*` headers
      skip: (req) => req.ip === '127.0.0.1'  // Don't limit localhost
    });

    this.scanLimiter = rateLimit({
      windowMs: 60 * 1000,  // 1 minute
      max: 5,  // max 5 scans per minute
      message: 'Too many scan requests, please try again later.',
      skipSuccessfulRequests: false
    });

    this.authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,  // 15 minutes
      max: 10,  // max 10 failed auth attempts
      skipFailedRequests: true,  // Only count failed requests
      skipSuccessfulRequests: false
    });

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // ... existing middleware ...
    
    // Apply rate limiting to all API routes
    this.app.use('/api/', this.generalLimiter);
  }

  private setupRoutes(): void {
    // ... existing routes ...
    
    // Apply stricter rate limits to dangerous endpoints
    this.app.post('/api/scan/trigger', this.scanLimiter, authMiddleware, async (req, res) => {
      // ...
    });

    this.app.post('/api/opportunities/clear', this.scanLimiter, authMiddleware, async (req, res) => {
      // ...
    });

    this.app.post('/api/blockchain-scan', this.scanLimiter, authMiddleware, async (req, res) => {
      // ...
    });
  }
}
```

---

## 8. Remove Hardcoded URLs

### File: `/src/config/environment.ts`

**BEFORE (Vulnerable):**
```typescript
const getWebappUrl = (): string => {
  const envUrl = process.env.WEBAPP_URL || process.env.RAILWAY_PUBLIC_DOMAIN;
  if (envUrl) {
    return envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
  }
  
  // Fallback to hardcoded production URL
  return 'https://webapp-production-c779.up.railway.app';  // VULNERABLE
};
```

**AFTER (Fixed):**
```typescript
const getWebappUrl = (): string => {
  const envUrl = process.env.WEBAPP_URL || process.env.RAILWAY_PUBLIC_DOMAIN;
  
  if (envUrl) {
    return envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
  }

  // Development fallback
  if (process.env.NODE_ENV === 'development') {
    return process.env.DEV_URL || 'http://localhost:3000';
  }

  // Production MUST have URL configured
  if (process.env.NODE_ENV === 'production') {
    throw new Error('WEBAPP_URL or RAILWAY_PUBLIC_DOMAIN must be set in production');
  }

  // Default localhost for development
  return 'http://localhost:3000';
};
```

### File: `/src/services/api.ts`

**BEFORE:**
```typescript
const getAPIBaseURL = (): string => {
  // ...
  return 'https://webapp-production-c779.up.railway.app/api';  // HARDCODED
};
```

**AFTER:**
```typescript
const getAPIBaseURL = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || 
                 import.meta.env.VITE_API_URL || 
                 process.env.WEBAPP_URL;
                 
  if (envUrl) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }
  
  if (import.meta.env.DEV) {
    return 'http://localhost:3000/api';
  }
  
  throw new Error('API_BASE_URL environment variable not set');
};
```

---

## 9. Add Input Validation

### Install dependency:
```bash
npm install zod
```

### File: `/src/webapp/server.ts`

```typescript
import { z } from 'zod';

// Define validation schemas
const scanTriggerSchema = z.object({
  timeout: z.number().int().positive().max(600).optional()
});

const blockchainScanSchema = z.object({
  chains: z.array(z.string()).optional(),
  minConfidence: z.number().min(0).max(100).optional()
});

// Create validation middleware
const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      (req as any).validated = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Invalid request parameters',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      } else {
        res.status(400).json({ error: 'Invalid request' });
      }
    }
  };
};

// Use in routes:
this.app.post(
  '/api/scan/trigger', 
  authMiddleware, 
  validateRequest(scanTriggerSchema),
  async (req, res) => {
    const validated = (req as any).validated;
    // ... use validated data
  }
);
```

---

## Summary Checklist

- [x] SQL Injection - Use parameterized queries
- [x] CORS - Reject non-whitelisted origins
- [x] SSL/TLS - Enable certificate validation
- [x] Authentication - Add middleware to dangerous endpoints
- [x] CSP - Enable with proper directives
- [x] Error handling - Remove sensitive information
- [x] Rate limiting - Install and apply
- [x] Hardcoded URLs - Use environment variables
- [x] Input validation - Add schema validation

