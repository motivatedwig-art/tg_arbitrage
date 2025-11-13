# Cursor AI Prompt: PostgreSQL Database Setup & Dual Deployment (Railway + Vercel)

## Context
I have a Telegram bot project that needs to:
1. Deploy the backend (Bot + API) to **Railway** with **PostgreSQL**
2. Deploy the frontend (React Web App) to **Vercel**
3. Fix current database configuration issues
4. Ensure proper separation between frontend and backend

## Current Issues
- Database configuration not working properly with Railway/Vercel
- Need to migrate from SQLite to PostgreSQL
- UI not showing properly in Telegram Web App
- Environment variables not configured correctly

---

## Task 1: Update Database Configuration for PostgreSQL

### File: `src/database/Database.ts`

Replace the entire file with this PostgreSQL-compatible version:

```typescript
import { Sequelize, Options } from 'sequelize';
import path from 'path';
import { UserModel } from './models/UserModel.js';
import { OpportunityModel } from './models/OpportunityModel.js';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private sequelize: Sequelize;
  private userModel: UserModel;
  private opportunityModel: OpportunityModel;
  private isInitialized: boolean = false;

  private constructor() {
    this.sequelize = this.createDatabaseConnection();
    this.userModel = new UserModel(this.sequelize);
    this.opportunityModel = new OpportunityModel(this.sequelize);
  }

  private createDatabaseConnection(): Sequelize {
    const isProduction = process.env.NODE_ENV === 'production';
    const isVercel = process.env.VERCEL === '1';
    const isRailway = !!process.env.RAILWAY_ENVIRONMENT;

    console.log('Database Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      isProduction,
      isVercel,
      isRailway,
      DATABASE_URL: !!process.env.DATABASE_URL,
    });

    // PostgreSQL (Railway or external provider)
    if (process.env.DATABASE_URL) {
      console.log('Using PostgreSQL from DATABASE_URL');
      
      const config: Options = {
        dialect: 'postgres',
        protocol: 'postgres',
        dialectOptions: {
          ssl: isProduction ? {
            require: true,
            rejectUnauthorized: false
          } : false
        },
        logging: !isProduction ? console.log : false,
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000
        }
      };

      return new Sequelize(process.env.DATABASE_URL, config);
    }

    // Fallback to SQLite for local development
    console.log('Using SQLite (local development only)');
    const dbPath = path.join(process.cwd(), 'database.sqlite');
    console.log('SQLite path:', dbPath);

    return new Sequelize({
      dialect: 'sqlite',
      storage: dbPath,
      logging: !isProduction ? console.log : false,
    });
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async init(): Promise<void> {
    if (this.isInitialized) {
      console.log('Database already initialized');
      return;
    }

    try {
      console.log('Initializing database connection...');
      
      await this.sequelize.authenticate();
      console.log('Database connection established successfully');

      await this.userModel.init();
      await this.opportunityModel.init();

      await this.sequelize.sync({ alter: false });
      console.log('Database synchronized');

      this.isInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  public async close(): Promise<void> {
    if (this.sequelize) {
      await this.sequelize.close();
      this.isInitialized = false;
      console.log('Database connection closed');
    }
  }

  public getUserModel(): UserModel {
    return this.userModel;
  }

  public getOpportunityModel(): OpportunityModel {
    return this.opportunityModel;
  }

  public getSequelize(): Sequelize {
    return this.sequelize;
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.sequelize.authenticate();
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}
```

---

## Task 2: Update UserModel for PostgreSQL Compatibility

### File: `src/database/models/UserModel.ts`

Update the model to use JSONB for PostgreSQL:

**Key changes needed:**
1. Change `DataTypes.JSON` to `DataTypes.JSONB` for `preferences` and `stats` fields
2. Add proper getters/setters to handle JSON parsing
3. Ensure indexes are properly defined
4. Add `underscored: true` for snake_case database columns

```typescript
// In the model definition, change:
preferences: {
  type: DataTypes.JSONB, // Changed from JSON to JSONB
  allowNull: false,
  defaultValue: {
    language: 'en',
    notifications: true,
    minProfitThreshold: 0.5,
    selectedExchanges: ['binance', 'okx', 'bybit', 'bitget', 'mexc', 'bingx', 'gateio', 'kucoin'],
  },
  get() {
    const rawValue = this.getDataValue('preferences');
    if (typeof rawValue === 'string') {
      return JSON.parse(rawValue);
    }
    return rawValue;
  }
},
stats: {
  type: DataTypes.JSONB, // Changed from JSON to JSONB
  allowNull: false,
  defaultValue: {
    totalOpportunitiesViewed: 0,
    highestProfitSeen: 0,
    lastActiveAt: new Date(),
    joinedAt: new Date(),
  },
  get() {
    const rawValue = this.getDataValue('stats');
    if (typeof rawValue === 'string') {
      return JSON.parse(rawValue);
    }
    return rawValue;
  }
}
```

Also add to the model options:
```typescript
{
  sequelize: this.sequelize,
  tableName: 'users',
  timestamps: true,
  underscored: true, // Use snake_case for database columns
  indexes: [
    { unique: true, fields: ['telegram_id'] },
    { fields: ['is_active'] },
  ],
}
```

---

## Task 3: Update package.json Dependencies

Add PostgreSQL dependencies:

```json
{
  "dependencies": {
    "pg": "^8.11.3",
    "pg-hstore": "^2.3.4",
    "sequelize": "^6.35.0"
  },
  "devDependencies": {
    "@types/pg": "^8.10.9"
  }
}
```

Run: `npm install`

---

## Task 4: Create Railway Configuration Files

### File: `railway.json`
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### File: `nixpacks.toml`
```toml
[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm start"
```

### File: `Procfile` (alternative)
```
web: npm start
```

---

## Task 5: Railway Deployment Configuration

Railway automatically detects the build configuration from `package.json` and `railway.json`:
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

## Task 6: Update Environment Variables

### File: `.env.example`
```bash
# Database (Railway PostgreSQL)
DATABASE_URL=postgresql://postgres:password@host:5432/database

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here
WEBAPP_URL=https://webapp-production-c779.up.railway.app

# API Configuration
PORT=3000
NODE_ENV=production
UPDATE_INTERVAL=600000
MIN_PROFIT_THRESHOLD=0.5

# Frontend API URL (Railway deployment)
VITE_API_BASE_URL=https://webapp-production-c779.up.railway.app/api

# Exchange APIs (optional)
BINANCE_API_KEY=
BINANCE_API_SECRET=
OKX_API_KEY=
OKX_API_SECRET=
OKX_PASSPHRASE=
BYBIT_API_KEY=
BYBIT_API_SECRET=
BITGET_API_KEY=
BITGET_API_SECRET=
MEXC_API_KEY=
MEXC_API_SECRET=
BINGX_API_KEY=
BINGX_API_SECRET=
GATE_IO_API_KEY=
GATE_IO_API_SECRET=
KUCOIN_API_KEY=
KUCOIN_API_SECRET=
KUCOIN_PASSPHRASE=
```

---

## Task 7: Add CORS Support for Vercel Frontend

### File: `src/index.ts` (or wherever you initialize Express)

Add CORS middleware:

```typescript
import cors from 'cors';

// Add after creating Express app
app.use(cors({
  origin: process.env.WEBAPP_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

Install cors: `npm install cors @types/cors`

---

## Task 8: Update Frontend API Service

### File: `src/services/api.ts` (or webapp equivalent)

```typescript
const getAPIBaseURL = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  
  if (envUrl) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }
  
  // Development fallback
  if (import.meta.env.DEV) {
    return 'http://localhost:3000/api';
  }
  
  // Production - this should be set via env var
  throw new Error('VITE_API_BASE_URL not configured');
};

const API_BASE_URL = getAPIBaseURL();
console.log('API Base URL:', API_BASE_URL);
```

---

## Task 9: Create Database Migration Script

### File: `scripts/migrate-to-postgres.ts`

```typescript
import { DatabaseManager } from '../src/database/Database.js';

async function migrate() {
  try {
    console.log('Starting database migration...');
    
    const db = DatabaseManager.getInstance();
    await db.init();
    
    console.log('Database initialized successfully');
    
    // Run migrations or seed data here if needed
    
    const isHealthy = await db.healthCheck();
    console.log('Database health check:', isHealthy ? 'PASS' : 'FAIL');
    
    await db.close();
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
```

Add to package.json scripts:
```json
{
  "scripts": {
    "migrate": "tsx scripts/migrate-to-postgres.ts"
  }
}
```

---

## Task 10: Update HTML for Telegram WebApp SDK

### File: `index.html`

Add the Telegram WebApp SDK script in the `<head>`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>Crypto Arbitrage Bot</title>
    
    <!-- CRITICAL: Telegram WebApp SDK -->
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

---

## Deployment Instructions

### Step 1: Deploy to Railway (Backend)

1. **Create Railway account and project**
   ```bash
   npm install -g @railway/cli
   railway login
   railway init
   ```

2. **Add PostgreSQL database**
   - In Railway dashboard: New → Database → PostgreSQL
   - Railway automatically sets `DATABASE_URL`

3. **Configure Environment Variables in Railway:**
   ```
   DATABASE_URL=${POSTGRES.DATABASE_URL}
   TELEGRAM_BOT_TOKEN=your_bot_token
   WEBAPP_URL=https://your-frontend.vercel.app
   NODE_ENV=production
   PORT=3000
   ```

4. **Deploy:**
   ```bash
   railway up
   ```

5. **Get your Railway URL from dashboard** (e.g., `https://your-app.up.railway.app`)

### Step 2: Deploy to Railway (Full Stack)

1. **Connect GitHub repo to Railway**
   - Go to railway.com → New Project
   - Import your repository

2. **Railway Auto-Detects Build Settings:**
   - Automatically detects Node.js + Vite configuration
   - Uses `railway.json` for deployment configuration
   - Builds with: `npm install && npm run build`

3. **Environment Variables are set automatically:**
   - Railway variables are configured via CLI or dashboard
   - `VITE_API_BASE_URL` points to Railway app URL

4. **Railway automatically provides the webapp URL**

5. **The WEBAPP_URL is already configured** in Railway environment variables

### Step 3: Test the Setup

1. **Check Railway logs:**
   ```bash
   railway logs
   ```

2. **Test database connection:**
   ```bash
   npm run migrate
   ```

3. **Open Vercel frontend and check browser console**

4. **Test in Telegram:**
   - Send `/webapp` command to your bot
   - Should open your Vercel-hosted web app

---

## Verification Checklist

Please implement all the above changes and verify:

- [ ] PostgreSQL dependencies installed (`pg`, `pg-hstore`)
- [ ] Database.ts updated with PostgreSQL connection logic
- [ ] UserModel.ts uses JSONB instead of JSON
- [ ] railway.json and nixpacks.toml created
- [ ] vercel.json created
- [ ] CORS middleware added to backend
- [ ] Environment variables configured in both Railway and Vercel
- [ ] Frontend API service uses VITE_API_BASE_URL
- [ ] Telegram WebApp SDK script added to index.html
- [ ] Database migration script created
- [ ] Backend deployed to Railway successfully
- [ ] Full stack deployed to Railway successfully
- [ ] Web app opens correctly from Telegram bot

---

## Expected Result

After implementing these changes:

1. ✅ Backend runs on Railway with PostgreSQL
2. ✅ Frontend runs on Vercel 
3. ✅ Database persists data across deployments
4. ✅ Telegram Web App UI displays correctly
5. ✅ API calls work between Vercel frontend and Railway backend
6. ✅ User preferences are saved to PostgreSQL
7. ✅ Bot commands work properly

---

## Troubleshooting

If issues occur:

1. **Check Railway logs:** `railway logs`
2. **Check Vercel logs:** In Vercel dashboard
3. **Test database connection:** `npm run migrate`
4. **Verify environment variables are set correctly**
5. **Check browser console for frontend errors**
6. **Verify CORS is properly configured**

Please implement all these changes and let me know if you encounter any errors.