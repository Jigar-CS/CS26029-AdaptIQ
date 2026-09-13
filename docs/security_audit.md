# AdaptIQ — Phase 12 Security Audit & Hardening Report

This report documents the security audit and hardening measures implemented for AdaptIQ across both backend and frontend layers.

---

## 1. SQL Injection Prevention & Query Parameterization

### Audit Scope
Every SQL query executed against the MySQL database was audited across `backend/models/`, `backend/services/`, and `backend/controllers/`.

### Findings & Implementation
- **Parameterized Execution:** All queries use `pool.execute(sql, [params])` or `pool.query(sql, [params])` with `?` placeholders.
- **Dynamic Filter Whitelisting:**
  - `User.updateProfile`: Whitelists permitted column names (`name`, `email`, `phone`, `college`, `branch`, `graduation_year`, `cgpa`, `linkedin_url`).
  - `Question.update`: Whitelists permitted column names (`topic_id`, `question_text`, `option_a`, `option_b`, `option_c`, `option_d`, `correct_option`, `difficulty`, `explanation`).
  - `CompanyTest.update`: Whitelists permitted column names (`company_name`, `time_limit_minutes`, `question_count`, `easy_count`, `medium_count`, `hard_count`, `is_active`).
- **Pagination & Ordering:** Limit and offset values are strictly sanitized with `parseInt` / `Number()` casting, and user inputs are never concatenated directly into query strings.

---

## 2. Input Validation & Boundary Enforcement

### Framework
Implemented using `express-validator` across all ingress endpoints in `studentRoutes.js`, `userRoutes.js`, `authRoutes.js`, and `adminRoutes.js`.

### Validations Enforced:
1. **User Profile:**
   - `phone`: Evaluated against regex `/^[0-9+() -]{7,20}$/`.
   - `graduation_year`: Restricted to integers between `2020` and `2035`.
   - `cgpa`: Bounded as a float between `0.00` and `10.00`.
   - `linkedin_url`: Validated with `.isURL()`.
2. **Adaptive & Company Tests:**
   - `selected_option`: Strictly validated against `['A', 'B', 'C', 'D']`.
   - `response_time_seconds`: Constrained to float between `0` and `3600`.
   - `time_spent_seconds`: Constrained to float between `0` and `7200`.
   - `topic_id`, `testId`, `question_id`: Validated as positive integers (`isInt({ min: 1 })`).
3. **Question Bank & Import:**
   - `difficulty`: Validated against `['Easy', 'Medium', 'Hard']`.
   - `correct_option`: Normalized and validated against `['A', 'B', 'C', 'D']`.
   - CSV Import: Stream-parsed and each row verified before batch transaction insertion.

---

## 3. Rate Limiting & Denial-of-Service (DoS) Protection

Configured via `express-rate-limit` in `backend/middleware/rateLimiter.js`:

| Limiter | Window | Max Requests | Endpoints Covered | Purpose |
|---|---|---|---|---|
| `authLimiter` | 15 minutes | 10 | `POST /api/auth/login`, `POST /api/auth/register` | Prevents credential brute-forcing |
| `csvImportLimiter` | 1 hour | 10 | `POST /api/admin/questions/import` | Prevents memory/CPU exhaustion via bulk parsing |
| `testStartLimiter` | 1 minute | 10 | `POST /api/adaptive/start`, `POST /api/company-tests/:id/start` | Prevents runaway test session creation |
| `testSubmissionLimiter` | 1 minute | 60 | `POST /api/adaptive/:testId/answer`, `POST /api/company-tests/:id/answer` | Prevents automated scraping and bot answer spam |
| `apiLimiter` | 1 minute | 120 | All `/api/*` routes | General platform rate ceiling |

---

## 4. Authentication, Token Handling & XSS Defense

### In-Memory Access Token Storage
- **Vulnerability Mitigated:** Storing short-lived JWT access tokens in `localStorage` exposes them to theft via Cross-Site Scripting (XSS).
- **Hardening:**
  - Short-lived `accessToken` is stored strictly in memory via `frontend/src/services/tokenManager.js`.
  - The `adaptiq_access_token` key is completely eliminated from `localStorage`.
  - On application startup or reload, the frontend performs a silent background exchange via `/api/auth/refresh` using the secure refresh token.
  - On 401 response, `apiClient` transparently requests a new token, updates memory, and retries the pending request.
  - On logout, both in-memory and stored credentials are fully cleared.

### HTML & Content Rendering
- Zero usage of `dangerouslySetInnerHTML` across the entire React application.
- All user and question text is rendered through React's native escaping mechanism.

---

## 5. File Upload Security

Configured in `uploadPhotoMiddleware.js` and `uploadResumeMiddleware.js`:
- **Strict MIME Type Verification:**
  - Profile Photos: Only `image/jpeg`, `image/png`, `image/webp`.
  - Resumes: Only `application/pdf`.
- **Filename Randomization:** Original user filenames are replaced with cryptographically secure UUIDs (`crypto.randomUUID() + ext`) to prevent directory traversal (`../`) and file overwrite attacks.
- **File Size Caps:**
  - Photo max size: `5 MB`.
  - Resume max size: `10 MB`.
  - CSV import max size: `10 MB`.
- **Execution Prevention:** Uploads folder is served strictly as static asset downloads/images, with no executable permissions.

---

## 6. HTTP Headers & Error Handling

- **Helmet:** Configured with `crossOriginResourcePolicy: { policy: 'cross-origin' }` to allow frontend clients on separate ports/domains to securely load profile photos and resumes.
- **Information Disclosure:** In `backend/middleware/errorHandler.js`, internal server errors (`status 500`) return a generic `'Internal server error'` when `NODE_ENV === 'production'`, preventing database schema leaks and stack trace disclosure.
- **CORS:** Restricted to `CLIENT_ORIGIN` (configured via environment variables) with credentials enabled.
