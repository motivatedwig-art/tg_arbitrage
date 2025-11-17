# Security Issues - Quick Reference Guide

## Critical Vulnerabilities (Fix Immediately)

### 1. SQL Injection in DatabasePostgres.ts
- **Files:**
  - `/home/user/tg_arbitrage/src/database/DatabasePostgres.ts` (Lines 103, 155)
  - `/home/user/tg_arbitrage/crypto-arbitrage-processor/src/database/DatabasePostgres.ts` (Lines 103, 155)
- **Method:** `getRecentOpportunities()` and `cleanupOldData()`
- **Issue:** String interpolation in SQL queries
- **Fix:** Use parameterized queries with `$1`, `$2` placeholders

### 2. Permissive CORS Configuration
- **File:** `/home/user/tg_arbitrage/src/webapp/server.ts` (Lines 38-57)
- **Also in:** `/home/user/tg_arbitrage/src/webapp/server-clean.ts`
- **Issue:** Allows all origins (line 51: `callback(null, true)` in else clause)
- **Fix:** Reject non-whitelisted origins

### 3. SSL/TLS Certificate Verification Bypass
- **Files:**
  - `/home/user/tg_arbitrage/src/database/DatabasePostgres.ts` (Line 10)
  - `/home/user/tg_arbitrage/crypto-arbitrage-processor/src/database/DatabasePostgres.ts` (Line 10)
  - `/home/user/tg_arbitrage/scripts/migrate-db.ts`
  - `/home/user/tg_arbitrage/scripts/add-blockchain-column.js`
  - `/home/user/tg_arbitrage/scripts/fix-profit-percentage-schema.ts`
  - `/home/user/tg_arbitrage/api/lib/database.js`
- **Issue:** `rejectUnauthorized: false` in production
- **Fix:** Set `rejectUnauthorized: true` and provide CA certificates

### 4. Missing Authentication on Dangerous Endpoints
- **File:** `/home/user/tg_arbitrage/src/webapp/server.ts`
- **Endpoints:**
  - Line 538: POST `/api/scan/trigger` - No auth
  - Line 567: POST `/api/opportunities/clear` - **DELETES ALL DATA**
  - Line 723: POST `/api/blockchain-scan` - No auth
- **Fix:** Add authentication middleware to these endpoints

---

## High Severity Vulnerabilities

### 5. Disabled Content Security Policy (CSP)
- **File:** `/home/user/tg_arbitrage/src/webapp/server.ts` (Lines 33-35)
- **Issue:** `contentSecurityPolicy: false`
- **Fix:** Enable CSP with proper directives

### 6. Error Information Leakage
- **File:** `/home/user/tg_arbitrage/src/webapp/server.ts`
- **Lines:** 169, 561, 755 (and others)
- **Issue:** Exposing `error.message` and `error.stack` in responses
- **Fix:** Log errors internally, return generic messages to clients

### 7. No Rate Limiting
- **File:** `/home/user/tg_arbitrage/src/webapp/server.ts` (All endpoints)
- **Issue:** No rate limiting middleware
- **Fix:** Install `express-rate-limit` and apply to all endpoints

### 8. Hardcoded Production Domain
- **Files:**
  - `/home/user/tg_arbitrage/src/config/environment.ts` (Lines 135, 139)
  - `/home/user/tg_arbitrage/src/services/api.ts` (Line 22)
- **Issue:** Hardcoded `webapp-production-c779.up.railway.app`
- **Fix:** Use environment variables with fallback

---

## Medium Severity Vulnerabilities

### 9. Weak API Key Management
- **File:** `/home/user/tg_arbitrage/src/config/environment.ts` (Lines 189-217)
- **Issue:** No validation that API keys are set
- **Fix:** Add validation and prevent logging of sensitive values

---

## Remediation Checklist

### Immediate (Critical - Do First)
- [ ] Fix SQL Injection in DatabasePostgres.ts (use parameterized queries)
- [ ] Add authentication to `/api/opportunities/clear`, `/api/scan/trigger`, `/api/blockchain-scan`
- [ ] Fix CORS to reject non-whitelisted origins
- [ ] Enable SSL certificate validation (set `rejectUnauthorized: true`)

### Short Term (High - Within 1 week)
- [ ] Install and implement rate limiting (`express-rate-limit`)
- [ ] Remove hardcoded URLs and use environment variables
- [ ] Fix error message leakage
- [ ] Enable CSP headers
- [ ] Add input validation library (zod/joi)

### Long Term (Improvements)
- [ ] Implement comprehensive request logging
- [ ] Add security headers (HSTS, X-Frame-Options, etc.)
- [ ] Implement API authentication (JWT/OAuth)
- [ ] Set up security monitoring and alerting
- [ ] Conduct penetration testing

---

## Files That Need Changes

1. **`/home/user/tg_arbitrage/src/database/DatabasePostgres.ts`**
   - Line 10: Fix SSL verification
   - Line 103: Fix SQL injection
   - Line 155: Fix SQL injection

2. **`/home/user/tg_arbitrage/src/webapp/server.ts`**
   - Line 33: Enable CSP
   - Lines 38-57: Fix CORS
   - Line 99: Remove or protect debug endpoint
   - Line 169: Remove error leak
   - Line 538: Add auth to `/api/scan/trigger`
   - Line 561: Remove error leak
   - Line 567: Add auth to `/api/opportunities/clear`
   - Line 755: Remove error leak

3. **`/home/user/tg_arbitrage/src/config/environment.ts`**
   - Line 135, 139: Remove hardcoded URLs

4. **`/home/user/tg_arbitrage/src/services/api.ts`**
   - Line 22: Remove hardcoded URL

---

## Testing Commands

```bash
# Test CORS with non-whitelisted origin
curl -H "Origin: https://evil.com" http://localhost:3000/api/opportunities -v

# Test for rate limiting
for i in {1..200}; do curl http://localhost:3000/api/opportunities & done

# Test for authentication on dangerous endpoint
curl -X POST http://localhost:3000/api/opportunities/clear

# Test error message leakage
curl http://localhost:3000/api/opportunities/invalid
```

---

## Priority Matrix

```
CRITICAL (Must fix before production):
- SQL Injection
- CORS Misconfiguration  
- Missing Auth on dangerous endpoints
- SSL/TLS bypass

HIGH (Must fix before production):
- CSP disabled
- Error info leakage
- No rate limiting
- Hardcoded URLs

MEDIUM (Should fix):
- API key management
```

---

## Impact Assessment

| Issue | Business Impact | Technical Impact | User Impact |
|-------|---|---|---|
| SQL Injection | Data loss/corruption | Database compromise | Data unavailable |
| CORS | Unauthorized data access | XSS/CSRF attacks | Account compromise |
| SSL Bypass | Data interception | MITM attacks | Secrets exposed |
| No Auth | Intentional data destruction | Service unavailable | Cannot use app |
| No Rate Limit | Service DoS | Resource exhaustion | App slow/unavailable |

---

For detailed information, see `/home/user/tg_arbitrage/SECURITY_AUDIT_REPORT.md`
