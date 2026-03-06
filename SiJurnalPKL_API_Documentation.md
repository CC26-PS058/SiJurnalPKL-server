# SiJurnalPKL — REST API Documentation

> **Platform:** E-Jurnal PKL SMK Transparan Berbasis Kecerdasan Buatan  
> **Stack:** Express.js · TypeScript · PostgreSQL (Prisma 7.x) · Next.js · n8n · OpenRouter  
> **Base URL:** `https://api.sijurnalpkl.id/v1`  
> **Auth Scheme:** Bearer Token (JWT)

---

## Table of Contents

1. [Conventions & Standards](#1-conventions--standards)
2. [Authentication & Security](#2-authentication--security)
3. [Attendance & Geolocation](#3-attendance--geolocation)
4. [AI Refiner & Reporting Pipeline](#4-ai-refiner--reporting-pipeline)
5. [Leave & Permission System](#5-leave--permission-system)
6. [Mentor Dashboard](#6-mentor-dashboard)
7. [Teacher Dashboard](#7-teacher-dashboard)
8. [Admin Governance](#8-admin-governance)
9. [Notification System](#9-notification-system)
10. [Database Constraints](#10-database-constraints)
11. [Standardized Error Responses](#11-standardized-error-responses)
12. [TypeScript Interfaces Reference](#12-typescript-interfaces-reference)

---

## 1. Conventions & Standards

### 1.1 Response Envelope

All API responses follow this envelope format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data:    T | null;
  message: string;
  meta?:   PaginationMeta;
}

interface PaginationMeta {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
}
```

**Success (200/201):**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully."
}
```

**Failure (4xx/5xx):**
```json
{
  "success": false,
  "data": null,
  "message": "Descriptive error message.",
  "errors": [ { "field": "latitude", "issue": "Required for WFO check-in." } ]
}
```

### 1.2 ID Format

All entity IDs are `VARCHAR(17)` — a custom nanoid-style string. Example: `STU_7k3mN9pQx2Rv1`.

### 1.3 Timestamp Format

All timestamps use **ISO 8601 with timezone offset**: `2026-03-07T08:00:00+07:00`

### 1.4 Role Enum

```typescript
type Role = "STUDENT" | "MENTOR" | "TEACHER" | "ADMIN";
```

---

## 2. Authentication & Security

### 2.1 RBAC Middleware Matrix

| Endpoint Group              | STUDENT | MENTOR | TEACHER | ADMIN |
|-----------------------------|:-------:|:------:|:-------:|:-----:|
| `/auth/*`                   | ✓       | ✓      | ✓       | ✓     |
| `/attendance/*`             | ✓       | —      | —       | —     |
| `/leave/request`            | ✓       | —      | —       | —     |
| `/leave/review/:id`         | —       | ✓      | —       | —     |
| `/student/reports/*`        | ✓       | ✓      | ✓       | —     |
| `/mentor/approve-batch`     | —       | ✓      | —       | —     |
| `/mentor/evaluation`        | —       | ✓      | —       | —     |
| `/teacher/analytics`        | —       | —      | ✓       | —     |
| `/admin/*`                  | —       | —      | —       | ✓     |

> **Middleware implementation:** Attach `requireRole(...roles: Role[])` middleware to each router group. The middleware decodes the JWT, checks `req.user.role`, and returns `403 Forbidden` if the role is not permitted.

---

### `POST /auth/login`

Authenticates a user and returns a JWT. If `activated` is `false`, the response includes a mandatory password-change flag.

**Request Body:**
```typescript
interface LoginRequest {
  email:    string;
  password: string;
}
```

**Response `200 OK` — First-time login (not yet activated):**
```json
{
  "success": true,
  "data": {
    "requiresPasswordChange": true,
    "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id":        "USR_4aB9kLmPqR2Wx",
      "name":      "Ahmad Fauzi",
      "role":      "STUDENT",
      "activated": false
    }
  },
  "message": "First login detected. Password change required."
}
```

> **`tempToken`** is a short-lived JWT (15 minutes) scoped **only** to `POST /auth/change-password`. Any other endpoint called with this token returns `403 Forbidden`.

**Response `200 OK` — Activated user:**
```json
{
  "success": true,
  "data": {
    "requiresPasswordChange": false,
    "accessToken":  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
    "expiresIn": 86400,
    "user": {
      "id":        "USR_4aB9kLmPqR2Wx",
      "name":      "Ahmad Fauzi",
      "role":      "STUDENT",
      "activated": true
    }
  },
  "message": "Login successful."
}
```

**Error Responses:**

| Status | Code                | Scenario                              |
|--------|---------------------|---------------------------------------|
| `401`  | `INVALID_CREDENTIALS` | Wrong email or password             |
| `403`  | `ACCOUNT_INACTIVE`  | Account not yet set up by Admin       |

---

### `POST /auth/change-password`

> 🔐 **Auth:** `tempToken` (first-time) **or** `accessToken` (voluntary change)  
> **Activation Logic:** Sets `activated = true` upon success.

**Request Body:**
```typescript
interface ChangePasswordRequest {
  currentPassword: string; // Old password (or default password for first-time)
  newPassword:     string; // Min 8 chars, at least 1 number, 1 uppercase
  confirmPassword: string;
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "data": { "activated": true },
  "message": "Password changed successfully. Account is now active."
}
```

**Error Responses:**

| Status | Code                     | Scenario                            |
|--------|--------------------------|-------------------------------------|
| `400`  | `PASSWORD_MISMATCH`      | `newPassword` ≠ `confirmPassword`   |
| `400`  | `WEAK_PASSWORD`          | Fails password policy               |
| `401`  | `INVALID_CURRENT_PASSWORD` | Current password is incorrect     |

---

### `POST /auth/refresh`

Refreshes the access token using a valid refresh token.

**Request Body:**
```typescript
interface RefreshRequest {
  refreshToken: string;
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn":   86400
  },
  "message": "Token refreshed."
}
```

---

### `POST /auth/logout`

> 🔐 **Auth:** `accessToken`

Invalidates the current refresh token server-side.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": null,
  "message": "Logged out successfully."
}
```

---

## 3. Attendance & Geolocation

> 🔐 **Auth:** `accessToken` — Role: `STUDENT`

### Geofencing Logic

The Haversine Formula is used to calculate the great-circle distance between the student's reported GPS coordinates and the registered industry coordinates.

```typescript
// Haversine Formula (TypeScript)
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

**Validation Rules by `WorkType`:**

| `work_type` | Radius Source         | Behavior on Exceed          |
|-------------|-----------------------|-----------------------------|
| `WFO`       | `Industry.radiusMeter`| Return `422` with `OUTSIDE_RADIUS` |
| `WFA`       | N/A (disabled)        | Distance stored, no rejection |

**GPS Retry Policy:**

| `gps_attempt_count` | `gps_accuracy` (meters) | `gps_status` | Action            |
|---------------------|-------------------------|--------------|-------------------|
| 1–2                 | ≤ 50                    | `VALID`      | Proceed normally  |
| 1–2                 | > 50                    | `WARNING`    | Store with flag   |
| 3                   | Any                     | `WARNING`    | Store with flag; alert sent to Mentor |
| —                   | Explicitly unavailable  | `INVALID`    | Reject (no data)  |

---

### `POST /attendance/check-in`

Records student arrival. Photo must be captured live from the device camera (gallery access is blocked client-side).

**Request:** `multipart/form-data`

```typescript
interface CheckInRequest {
  placement_id:      string;   // VARCHAR(17) — active placement ID
  work_type:         WorkType; // "WFO" | "WFA"
  latitude:          number;   // e.g. -6.914744
  longitude:         number;   // e.g. 107.609810
  gps_accuracy:      number;   // Accuracy in meters from Geolocation API
  gps_attempt_count: number;   // How many retries before this submission
  check_in_photo:    File;     // JPEG/PNG, max 5MB — live camera capture only
  user_agent:        string;   // Populated server-side from req.headers
}
```

**Server-side Processing Steps:**
1. Verify `placement_id` belongs to the authenticated student and status is `ACTIVE`.
2. Confirm no existing `AttendanceLog` for this `placement_id` + `workDate` (today).
3. If `work_type = WFO`: Fetch `Industry.latitude`, `Industry.longitude`, `Industry.radiusMeter`. Run Haversine. If `distance > radiusMeter`, return `422`.
4. Determine `gps_status` from `gps_attempt_count` and `gps_accuracy`.
5. Determine `status_attendance`: `PRESENT` if on time, `LATE` if after configured cutoff.
6. Upload `check_in_photo` to object storage. Store URL.
7. Insert `AttendanceLog` record.

**Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "attendance_id":          "ATT_9mK3nBpXcR5Tz",
    "work_date":              "2026-03-07",
    "work_type":              "WFO",
    "check_in_time":          "2026-03-07T08:02:00+07:00",
    "distance_from_industry": 87.4,
    "gps_status":             "VALID",
    "gps_accuracy":           12.5,
    "gps_attempt_count":      1,
    "status_attendance":      "PRESENT",
    "check_in_photo_url":     "https://cdn.sijurnalpkl.id/photos/ATT_9mK3nBpXcR5Tz_in.jpg"
  },
  "message": "Check-in recorded successfully."
}
```

**Response `201 Created` — With GPS Warning flag:**
```json
{
  "success": true,
  "data": {
    "attendance_id":          "ATT_2xP7qRmVwN4Ks",
    "gps_status":             "WARNING",
    "gps_attempt_count":      3,
    "flagged":                true,
    "flag_reason":            "GPS_RETRY_LIMIT_REACHED — Pending manual mentor review."
  },
  "message": "Check-in recorded with GPS warning. Mentor has been notified for manual review."
}
```

**Error Responses:**

| Status | Code                    | Scenario                                      |
|--------|-------------------------|-----------------------------------------------|
| `400`  | `ALREADY_CHECKED_IN`    | Duplicate check-in for today's date           |
| `400`  | `INVALID_PLACEMENT`     | Placement not found or not owned by student   |
| `400`  | `PLACEMENT_INACTIVE`    | Placement status is not `ACTIVE`              |
| `403`  | `FORBIDDEN`             | Non-student role attempting check-in          |
| `422`  | `OUTSIDE_RADIUS`        | WFO distance exceeds `Industry.radiusMeter`   |

---

### `POST /attendance/check-out`

Records student departure and daily activity report. Triggers the asynchronous AI Refiner pipeline.

**Request:** `multipart/form-data`

```typescript
interface CheckOutRequest {
  attendance_id:   string; // From today's check-in
  check_out_photo: File;   // JPEG/PNG — activity photo, front or back camera
  raw_text:        string; // Daily activity description (min 30 chars)
}
```

**Server-side Processing Steps:**
1. Verify `attendance_id` belongs to the authenticated student and `check_out_time` is `null`.
2. Upload `check_out_photo`. Store URL.
3. Update `AttendanceLog`: set `check_out_time = now()`.
4. **Insert** `DailyLog` record with `raw_text`, `ai_status = PENDING`, `approval_status = PENDING`.
5. **Asynchronously** dispatch webhook to n8n (do not await). See [Section 4.1](#41-outgoing-webhook-to-n8n).
6. Return `200` immediately — do not block on AI processing.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "daily_id":       "DLY_5hJ2mKpNrT8Wq",
    "attendance_id":  "ATT_9mK3nBpXcR5Tz",
    "check_out_time": "2026-03-07T17:05:00+07:00",
    "ai_status":      "PENDING",
    "raw_text_saved": true,
    "message_detail": "Daily log saved. AI refinement is processing in the background."
  },
  "message": "Check-out recorded. Daily log submitted for AI processing."
}
```

**Error Responses:**

| Status | Code                      | Scenario                                     |
|--------|---------------------------|----------------------------------------------|
| `400`  | `ALREADY_CHECKED_OUT`     | `check_out_time` already exists              |
| `400`  | `NO_CHECKIN_TODAY`        | No matching check-in record found            |
| `400`  | `RAW_TEXT_TOO_SHORT`      | `raw_text` is under 30 characters            |

---

## 4. AI Refiner & Reporting Pipeline

### 4.1 Outgoing Webhook to n8n

After a successful check-out, the Express backend fires a `POST` to the configured n8n webhook URL. This call is **fire-and-forget** — the backend does not await the response.

**Outgoing Payload (Express → n8n):**
```typescript
interface N8nWebhookPayload {
  daily_id:     string; // DailyLog ID for the callback
  student_id:   string;
  placement_id: string;
  work_date:    string; // ISO 8601 date string
  raw_text:     string; // The student's original activity description
  callback_url: string; // e.g. "https://api.sijurnalpkl.id/v1/internal/ai-callback"
}
```

**Example Payload:**
```json
{
  "daily_id":     "DLY_5hJ2mKpNrT8Wq",
  "student_id":   "STU_7k3mN9pQx2Rv1",
  "placement_id": "PLC_1cA8jFqZmB3Ys",
  "work_date":    "2026-03-07",
  "raw_text":     "hari ini gue bantu setup server baru terus debug error pas deploy ke staging",
  "callback_url": "https://api.sijurnalpkl.id/v1/internal/ai-callback"
}
```

**n8n Workflow Responsibilities:**
1. Receive payload from Express.
2. Inject `raw_text` into an OpenRouter prompt template (e.g., extract professional language + skill tags).
3. Validate JSON output structure.
4. `POST` results back to `callback_url`.

**Expected OpenRouter Prompt Template (injected by n8n):**
```
You are a professional technical report writer for vocational internship journals.
Rewrite the following raw student activity log into formal Indonesian Bahasa Indonesia.
Extract a list of technical skill tags demonstrated.

Raw text: "{raw_text}"

Respond ONLY in JSON with no markdown formatting:
{
  "processed_text": "Formal rewritten activity report...",
  "skill_tags": ["Linux Server", "CI/CD", "Debugging"]
}
```

---

### 4.2 Incoming AI Callback

> **Route:** `POST /internal/ai-callback`  
> ⚠️ **Internal Only:** Protected by a shared secret header (`X-Internal-Secret`). Not accessible by any user role JWT.

**Incoming Payload (n8n → Express):**
```typescript
interface AiCallbackPayload {
  daily_id:       string;
  processed_text: string;
  skill_tags:     string[];
  ai_status:      "SUCCESS" | "FAILED";
  error_message?: string; // Present when ai_status = "FAILED"
}
```

**Server-side Processing:**
- If `ai_status = SUCCESS`: Update `DailyLog` — set `processed_text`, `skill_tags`, `ai_status = SUCCESS`.
- If `ai_status = FAILED`: Update `DailyLog` — set `ai_status = FAILED`. Schedule a retry job (max 3 attempts with exponential backoff). Raw text remains accessible to mentor.

**Retry Logic (Server-level):**

| Attempt | Delay   | Action on Final Failure            |
|---------|---------|------------------------------------|
| 1st     | 5 min   | Re-dispatch to n8n                 |
| 2nd     | 15 min  | Re-dispatch to n8n                 |
| 3rd     | 30 min  | Mark `ai_status = FAILED` permanently; notify Admin |

---

### `GET /student/reports/history`

> 🔐 **Auth:** `accessToken` — Role: `STUDENT`, `MENTOR`, `TEACHER`

Fetches paginated attendance and daily log history for a student.

**Query Parameters:**

| Param         | Type     | Required | Description                                   |
|---------------|----------|----------|-----------------------------------------------|
| `student_id`  | `string` | No*      | Required for MENTOR/TEACHER; defaults to self for STUDENT |
| `placement_id`| `string` | No       | Filter by specific placement period           |
| `from`        | `string` | No       | ISO 8601 date — start of range                |
| `to`          | `string` | No       | ISO 8601 date — end of range                  |
| `page`        | `number` | No       | Default: 1                                    |
| `limit`       | `number` | No       | Default: 20, Max: 100                         |

**Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "attendance_id":          "ATT_9mK3nBpXcR5Tz",
      "work_date":              "2026-03-07",
      "work_type":              "WFO",
      "check_in_time":          "2026-03-07T08:02:00+07:00",
      "check_out_time":         "2026-03-07T17:05:00+07:00",
      "status_attendance":      "PRESENT",
      "gps_status":             "VALID",
      "distance_from_industry": 87.4,
      "daily_log": {
        "daily_id":       "DLY_5hJ2mKpNrT8Wq",
        "raw_text":       "hari ini gue bantu setup server baru terus debug error...",
        "processed_text": "Pada hari ini, saya berpartisipasi dalam konfigurasi server baru...",
        "skill_tags":     ["Linux Server", "CI/CD", "Debugging"],
        "ai_status":      "SUCCESS",
        "approval_status":"PENDING"
      }
    }
  ],
  "meta": {
    "page": 1, "limit": 20, "total": 45, "totalPages": 3
  },
  "message": "Report history fetched."
}
```

---

### `GET /student/final-recommendation`

> 🔐 **Auth:** `accessToken` — Role: `STUDENT`  
> **Gate:** Only accessible if `IndustryEvaluation` has been submitted by the assigned Mentor.

Aggregates all `processed_text` entries from `DailyLog` across the entire placement and triggers the AI career recommendation workflow.

**Processing Steps:**
1. Verify `IndustryEvaluation` exists for this student's placement. If not, return `403 EVALUATION_PENDING`.
2. Aggregate all `skill_tags` across all `DailyLog` where `ai_status = SUCCESS`.
3. Dispatch aggregated data to n8n for AI interview simulation and project title generation.
4. Store result in `FinalAssessment` (or return inline if not yet persisted).

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "recommendation_status": "ELIGIBLE",
    "aggregated_skill_tags": ["Linux Server", "CI/CD", "Debugging", "REST API", "PostgreSQL"],
    "competency_summary":    "Siswa menunjukkan kompetensi kuat di bidang DevOps dan backend development...",
    "project_suggestions": [
      {
        "rank":  1,
        "title": "Implementasi CI/CD Pipeline Otomatis pada Aplikasi Web Berbasis Docker",
        "rationale": "Berdasarkan 12 entri jurnal yang mencatat aktivitas deployment dan debugging server."
      },
      {
        "rank":  2,
        "title": "Perancangan REST API Berbasis Node.js untuk Sistem Monitoring Server Real-Time",
        "rationale": "Mencerminkan pengalaman konsisten dalam pengembangan API dan manajemen database."
      }
    ]
  },
  "message": "Final recommendation generated."
}
```

**Error Responses:**

| Status | Code                  | Scenario                                      |
|--------|-----------------------|-----------------------------------------------|
| `403`  | `EVALUATION_PENDING`  | Mentor has not submitted `IndustryEvaluation` |
| `403`  | `PKL_NOT_FINISHED`    | Placement status is still `ACTIVE`            |
| `409`  | `ALREADY_GENERATED`   | `FinalAssessment` already exists              |

---

## 5. Leave & Permission System

### `POST /leave/request`

> 🔐 **Auth:** `accessToken` — Role: `STUDENT`

Student submits an absence request (sick or personal). Triggers an automated WhatsApp notification to the assigned Mentor.

**Request Body:**
```typescript
interface LeaveRequestBody {
  placement_id: string;
  leave_date:   string;   // ISO 8601 date — must be today or a future date
  type:         LeaveType; // "SICK" | "PERSONAL"
  reason:       string;   // Min 10 chars
}
```

**Server-side Processing Steps:**
1. Validate no existing `AttendanceLog` or `LeaveRequest` for this `placement_id` + `leave_date`.
2. Insert `LeaveRequest` with `status = PENDING`.
3. Resolve assigned Mentor's `whatsappNumber` via the placement's industry.
4. Dispatch WhatsApp notification (via n8n or direct API). See [Section 9](#9-notification-system).

**Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "leave_id":    "LVE_3rG6hMnBvK9Px",
    "leave_date":  "2026-03-08",
    "type":        "SICK",
    "status":      "PENDING",
    "notified":    true,
    "created_at":  "2026-03-07T20:10:00+07:00"
  },
  "message": "Leave request submitted. Mentor has been notified."
}
```

**Error Responses:**

| Status | Code                  | Scenario                                          |
|--------|-----------------------|---------------------------------------------------|
| `409`  | `DATE_CONFLICT`       | Attendance or leave already exists for that date  |
| `400`  | `PAST_DATE`           | `leave_date` is earlier than yesterday            |
| `400`  | `REASON_TOO_SHORT`    | `reason` is under 10 characters                  |

---

### `PATCH /leave/review/:id`

> 🔐 **Auth:** `accessToken` — Role: `MENTOR`

Mentor reviews a pending leave request. Includes an **override path** to convert an approved leave to `CONVERTED_TO_ALPHA` with mandatory audit logging.

**Route Parameter:**

| Param | Type     | Description             |
|-------|----------|-------------------------|
| `id`  | `string` | `leave_id` to be reviewed |

**Request Body:**
```typescript
interface LeaveReviewRequest {
  action: "APPROVE" | "REJECT" | "CONVERT_TO_ALPHA";
  reason?: string; // Required when action = "CONVERT_TO_ALPHA" (min 20 chars)
}
```

**Server-side Processing — `CONVERT_TO_ALPHA` Path:**
1. Verify `LeaveRequest.status` is currently `APPROVED` (can only convert from approved state).
2. Verify the leave belongs to a student under this Mentor's industry.
3. Update `LeaveRequest.status = CONVERTED_TO_ALPHA`.
4. Find the corresponding `AttendanceLog` for that `leave_date` (if exists) and update `status_attendance = ALPHA`.
5. **Mandatory:** Insert record into `AuditLog` table.

**AuditLog Entry (auto-created on CONVERT_TO_ALPHA):**
```typescript
interface AuditLogEntry {
  target_type: "leave_request";           // Fixed value
  target_id:   string;                    // The leave_id being changed
  changed_by:  string;                    // mentor_id
  from_status: "APPROVED";
  to_status:   "CONVERTED_TO_ALPHA";
  reason:      string;                    // Mentor's provided reason
  changed_at:  string;                    // Auto: now()
}
```

**Response `200 OK` — Standard Approve/Reject:**
```json
{
  "success": true,
  "data": {
    "leave_id":    "LVE_3rG6hMnBvK9Px",
    "status":      "APPROVED",
    "reviewed_by": "MNT_8wA5dFqHsZ7Uc",
    "reviewed_at": "2026-03-07T09:00:00+07:00"
  },
  "message": "Leave request approved."
}
```

**Response `200 OK` — Convert to Alpha:**
```json
{
  "success": true,
  "data": {
    "leave_id":      "LVE_3rG6hMnBvK9Px",
    "status":        "CONVERTED_TO_ALPHA",
    "audit_log_id":  "AUD_6bN3cRpVwM2Kx",
    "reviewed_at":   "2026-03-07T10:30:00+07:00"
  },
  "message": "Leave converted to Alpha. Audit log created for transparency."
}
```

**Error Responses:**

| Status | Code                    | Scenario                                           |
|--------|-------------------------|----------------------------------------------------|
| `403`  | `NOT_YOUR_STUDENT`      | Leave belongs to a student outside this Mentor's industry |
| `404`  | `LEAVE_NOT_FOUND`       | `leave_id` does not exist                          |
| `409`  | `INVALID_TRANSITION`    | Attempting `CONVERT_TO_ALPHA` on non-`APPROVED` leave |
| `400`  | `REASON_REQUIRED`       | `reason` missing for `CONVERT_TO_ALPHA` action     |

---

### `GET /leave/history`

> 🔐 **Auth:** `accessToken` — Role: `STUDENT` (own records), `MENTOR` (supervised students)

**Query Parameters:**

| Param         | Type     | Required | Description                      |
|---------------|----------|----------|----------------------------------|
| `student_id`  | `string` | No*      | Required for MENTOR               |
| `placement_id`| `string` | No       | Filter by placement               |
| `status`      | `string` | No       | Filter by `LeaveStatus` enum      |
| `page`        | `number` | No       | Default: 1                        |
| `limit`       | `number` | No       | Default: 20                       |

**Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "leave_id":    "LVE_3rG6hMnBvK9Px",
      "leave_date":  "2026-03-08",
      "type":        "SICK",
      "reason":      "Demam dan sakit kepala",
      "status":      "APPROVED",
      "reviewed_by": "MNT_8wA5dFqHsZ7Uc",
      "reviewed_at": "2026-03-07T09:00:00+07:00",
      "created_at":  "2026-03-07T20:10:00+07:00"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 4, "totalPages": 1 },
  "message": "Leave history fetched."
}
```

---

## 6. Mentor Dashboard

> 🔐 **Auth:** `accessToken` — Role: `MENTOR`

### `GET /mentor/students`

Returns a list of all students under this Mentor's industry, with their latest attendance status.

**Query Parameters:**

| Param    | Type     | Required | Description                    |
|----------|----------|----------|--------------------------------|
| `status` | `string` | No       | Filter by `PklStatus`          |
| `flagged`| `boolean`| No       | If `true`, return only flagged (WARNING) attendance records |

**Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "student_id":    "STU_7k3mN9pQx2Rv1",
      "name":          "Ahmad Fauzi",
      "nis":           "20230001",
      "status_pkl":    "ACTIVE",
      "placement_id":  "PLC_1cA8jFqZmB3Ys",
      "placement_end": "2026-03-29",
      "today_attendance": {
        "status":     "PRESENT",
        "gps_status": "VALID",
        "flagged":    false
      },
      "pending_logs": 3
    }
  ],
  "message": "Student list fetched."
}
```

---

### `PATCH /mentor/approve-batch`

> **Business Rule:** Batch weekly approval is the primary workflow. Mentor approves multiple daily logs at once rather than one-by-one daily.

**Request Body:**
```typescript
interface BatchApproveRequest {
  daily_log_ids: string[];        // Array of DailyLog IDs
  action:        "APPROVE" | "REJECT";
  note?:         string;          // Optional feedback note for all entries
}
```

**Server-side Processing:**
1. Validate all `daily_log_ids` belong to students under this Mentor's industry.
2. Reject any IDs where `approval_status` is already `APPROVED` or `REJECTED`.
3. Bulk update `approval_status`, `approved_by = mentor_id`, `approved_at = now()`.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "processed": 5,
    "skipped":   1,
    "skip_reason": "1 log was already approved.",
    "action":    "APPROVE"
  },
  "message": "Batch approval completed."
}
```

**Error Responses:**

| Status | Code                 | Scenario                                            |
|--------|----------------------|-----------------------------------------------------|
| `400`  | `EMPTY_IDS`          | `daily_log_ids` array is empty                      |
| `403`  | `CROSS_INDUSTRY`     | One or more logs belong to a student outside this Mentor |
| `400`  | `INVALID_IDS`        | One or more `daily_log_ids` do not exist            |

---

### `POST /mentor/evaluation`

Submits the mandatory end-of-placement evaluation. **This is a gatekeeper action** — until submitted, the student cannot access `/student/final-recommendation`.

**Request Body:**
```typescript
interface IndustryEvaluationRequest {
  placement_id:        string;
  discipline_score:    number; // 1–100
  technical_score:     number; // 1–100
  communication_score: number; // 1–100
  teamwork_score:      number; // 1–100
  notes:               string; // Min 30 chars
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "evaluation_id":      "EVL_4kJ7mBnXcP2Wy",
    "placement_id":       "PLC_1cA8jFqZmB3Ys",
    "submitted_at":       "2026-03-29T15:00:00+07:00",
    "gate_unlocked":      true,
    "message_detail":     "Student can now access the final recommendation."
  },
  "message": "Industry evaluation submitted. PKL closure gate unlocked."
}
```

**Error Responses:**

| Status | Code                   | Scenario                                       |
|--------|------------------------|------------------------------------------------|
| `409`  | `ALREADY_EVALUATED`    | Evaluation for this placement already submitted |
| `400`  | `SCORE_OUT_OF_RANGE`   | Any score is not between 1 and 100              |
| `403`  | `NOT_YOUR_STUDENT`     | Placement does not belong to this Mentor's industry |

---

### `GET /mentor/audit-logs`

Returns the audit trail for all status changes made by this Mentor.

**Query Parameters:**

| Param       | Type     | Required | Description                    |
|-------------|----------|----------|--------------------------------|
| `target_type`| `string`| No       | `"attendance_log"` or `"leave_request"` |
| `from`      | `string` | No       | ISO 8601 date                  |
| `to`        | `string` | No       | ISO 8601 date                  |
| `page`      | `number` | No       | Default: 1                     |

**Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "audit_id":    "AUD_6bN3cRpVwM2Kx",
      "target_type": "leave_request",
      "target_id":   "LVE_3rG6hMnBvK9Px",
      "from_status": "APPROVED",
      "to_status":   "CONVERTED_TO_ALPHA",
      "reason":      "Siswa tidak benar-benar sakit berdasarkan laporan rekan kerja.",
      "changed_at":  "2026-03-07T10:30:00+07:00"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 2, "totalPages": 1 },
  "message": "Audit log fetched."
}
```

---

## 7. Teacher Dashboard

> 🔐 **Auth:** `accessToken` — Role: `TEACHER`

### `GET /teacher/analytics`

Returns aggregated analytics for all students under this Teacher's supervision.

**Query Parameters:**

| Param         | Type     | Required | Description                            |
|---------------|----------|----------|----------------------------------------|
| `placement_id`| `string` | No       | Filter by specific placement           |
| `from`        | `string` | No       | ISO 8601 date                          |
| `to`          | `string` | No       | ISO 8601 date                          |

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_students":   12,
      "active_placements": 10,
      "students_at_risk":  2
    },
    "students": [
      {
        "student_id":   "STU_7k3mN9pQx2Rv1",
        "name":         "Ahmad Fauzi",
        "placement_id": "PLC_1cA8jFqZmB3Ys",
        "industry":     "PT. Teknologi Nusantara",
        "attendance_stats": {
          "present": 18,
          "late":     2,
          "leave":    1,
          "alpha":    0,
          "total_days": 21,
          "attendance_rate_pct": 90.5
        },
        "overwork_detected": true,
        "overwork_detail": {
          "occurrences": 5,
          "latest_checkout": "2026-03-06T21:30:00+07:00",
          "threshold_exceeded": "22:00 WIB (3+ occurrences in last 7 days)"
        },
        "placement_end_date": "2026-03-29",
        "days_remaining": 22
      }
    ]
  },
  "message": "Teacher analytics fetched."
}
```

> **Overwork Detection Logic:** Flag a student if `check_out_time` is after the configured work-end threshold (e.g., 20:00) on **3 or more occasions within any 7-day rolling window**.

---

### `GET /teacher/pickup-schedule`

Returns students whose placement end dates fall within the next 14 days. Used for scheduling site visits or student collection.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "student_id":    "STU_7k3mN9pQx2Rv1",
      "name":          "Ahmad Fauzi",
      "industry_name": "PT. Teknologi Nusantara",
      "industry_address": "Jl. Asia Afrika No. 8, Bandung",
      "end_date":      "2026-03-15",
      "days_remaining": 8
    }
  ],
  "message": "Pickup schedule fetched."
}
```

---

## 8. Admin Governance

> 🔐 **Auth:** `accessToken` — Role: `ADMIN`

### 8.1 User Management

#### `POST /admin/users`

Creates a new user account. The initial password is auto-generated and delivered via the configured notification channel (WhatsApp/Email). `activated` is set to `false`.

**Request Body:**
```typescript
interface CreateUserRequest {
  name:             string;
  email:            string;
  whatsapp_number:  string;
  role:             Role;
  school_id?:       string; // Required for STUDENT, TEACHER
  industry_id?:     string; // Required for MENTOR
  nis?:             bigint; // Required for STUDENT
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "user_id":   "USR_2nP5xBqMcK8Jz",
    "role":      "STUDENT",
    "activated": false,
    "message_detail": "Default credentials sent to WhatsApp: +6281234567890"
  },
  "message": "User created. Credentials dispatched."
}
```

---

#### `PATCH /admin/users/:id`

Updates user details. Cannot be used to change `role` or `password`.

#### `DELETE /admin/users/:id`

Soft-deletes a user. Sets `activated = false` and detaches from active placements.

---

### 8.2 Industry (CRUD)

#### `POST /admin/industries`

**Request Body:**
```typescript
interface CreateIndustryRequest {
  name:         string;
  address:      string;
  latitude:     number;   // Decimal(10,6)
  longitude:    number;   // Decimal(10,6)
  radius_meter: number;   // In meters — used for WFO geofencing
}
```

#### `PUT /admin/industries/:id`

Full update of industry record including geofencing coordinates and radius.

---

### 8.3 Placement Management

#### `POST /admin/placements`

Maps a student to an industry with a defined PKL period.

**Request Body:**
```typescript
interface CreatePlacementRequest {
  student_id:  string;
  industry_id: string;
  start_date:  string; // ISO 8601
  end_date:    string; // ISO 8601
}
```

---

### 8.4 Bulk Import

#### `POST /admin/import/students`

> **Content-Type:** `multipart/form-data`  
> **Accepted Formats:** `.csv`, `.xlsx`

**CSV/XLSX Column Schema:**

| Column           | Type     | Required | Notes                          |
|------------------|----------|----------|--------------------------------|
| `name`           | `string` | ✓        | Full name                      |
| `nis`            | `number` | ✓        | Unique student ID number       |
| `email`          | `string` | ✓        | Must be unique                 |
| `whatsapp_number`| `string` | ✓        | Format: `+628xxxxxxxxxx`       |
| `school_id`      | `string` | ✓        | Must exist in `schools` table  |
| `industry_id`    | `string` | No       | If provided, auto-creates placement |
| `placement_start`| `date`   | No       | Required if `industry_id` set  |
| `placement_end`  | `date`   | No       | Required if `industry_id` set  |

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "total_rows":   50,
    "imported":     48,
    "skipped":       2,
    "errors": [
      { "row": 12, "reason": "Email already exists: ahmad@email.com" },
      { "row": 27, "reason": "school_id SCH_invalid not found." }
    ]
  },
  "message": "Bulk import completed with 2 errors."
}
```

---

### `GET /admin/system-config`

Returns and allows updating global system parameters.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "work_start_time":       "07:30",
    "late_threshold_time":   "08:00",
    "work_end_time":         "17:00",
    "overwork_threshold":    "20:00",
    "gps_accuracy_threshold": 50,
    "ai_retry_max_attempts": 3
  },
  "message": "System configuration fetched."
}
```

#### `PATCH /admin/system-config`

Updates one or more system configuration values.

---

## 9. Notification System

### 9.1 WhatsApp Integration via n8n

Notifications are dispatched via an n8n workflow node connected to a WhatsApp Business API provider (e.g., Fonnte, Wablas, or WhatsApp Cloud API). Email is configured as a fallback.

**Outgoing Notification Payload (Express → n8n):**
```typescript
interface NotificationPayload {
  channel:    "whatsapp" | "email";
  recipient:  string;    // Phone number or email address
  template:   NotificationTemplate;
  data:       Record<string, string>; // Template variable values
}

type NotificationTemplate =
  | "LEAVE_REQUEST_ALERT"       // Sent to Mentor on new leave submission
  | "GPS_WARNING_ALERT"         // Sent to Mentor on 3x GPS retry
  | "ACCOUNT_CREDENTIALS"       // Sent to new user on account creation
  | "PKL_ENDING_REMINDER";      // Sent to Teacher 14 days before placement end
```

**Template: `LEAVE_REQUEST_ALERT`**
```
[SiJurnalPKL] Permohonan Izin Masuk
Siswa: {student_name}
Tanggal: {leave_date}
Jenis: {leave_type}
Alasan: {reason}
Harap tinjau di dashboard Anda.
```

**Fallback Strategy:**

| Primary Channel | Fallback  | Condition                          |
|-----------------|-----------|------------------------------------|
| WhatsApp        | Email     | WhatsApp API unreachable or quota exceeded |
| Email           | Log only  | Email server error                 |

---

## 10. Database Constraints

The following constraints are enforced at the database level (Prisma schema + PostgreSQL) and must be reflected in API validation logic.

### 10.1 Unique Constraints

| Table             | Unique Constraint Fields        | API Error Code           |
|-------------------|---------------------------------|--------------------------|
| `attendance_logs` | `(placement_id, work_date)`     | `ALREADY_CHECKED_IN`     |
| `leave_requests`  | `(placement_id, leave_date)`    | `DATE_CONFLICT`          |
| `industry_evaluations` | `(mentor_id, placement_id)` | `ALREADY_EVALUATED`    |
| `daily_logs`      | `attendance_id`                 | N/A (1:1 with attendance)|
| `final_assessments`| `student_id`                   | `ALREADY_GENERATED`      |
| `users`           | `email`                         | `EMAIL_TAKEN`            |
| `students`        | `nis`                           | `NIS_TAKEN`              |

### 10.2 Business-Level Constraints (Enforced in Service Layer)

| Rule                                           | Enforcement Location  |
|------------------------------------------------|-----------------------|
| `check_out_time` must be after `check_in_time` | Service layer         |
| `leave_date` cannot have existing `AttendanceLog` | Service layer      |
| `CONVERT_TO_ALPHA` only from `APPROVED` state  | Service layer         |
| Final recommendation blocked without `IndustryEvaluation` | Service layer |
| `activated = false` users blocked from all routes except `/auth/change-password` | Auth middleware |
| Student can only access own `placement_id`     | Auth + service layer  |
| Mentor can only act on students in own industry| Auth + service layer  |
| One `DailyLog` per `AttendanceLog`             | DB unique constraint  |

### 10.3 Index Strategy

Critical indexes for query performance:

```sql
-- High-frequency attendance queries
CREATE INDEX idx_attendance_student     ON attendance_logs(student_id);
CREATE INDEX idx_attendance_work_date   ON attendance_logs(work_date);
CREATE INDEX idx_attendance_status      ON attendance_logs(status_attendance);
CREATE INDEX idx_attendance_gps_status  ON attendance_logs(gps_status);

-- Daily log approval workflow
CREATE INDEX idx_daily_approval         ON daily_logs(approval_status, ai_status);

-- Leave management
CREATE INDEX idx_leave_status           ON leave_requests(status);
CREATE INDEX idx_leave_reviewed_by      ON leave_requests(reviewed_by);

-- Audit trail
CREATE INDEX idx_audit_target           ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_changed_at       ON audit_logs(changed_at);
```

---

## 11. Standardized Error Responses

### 11.1 Error Response Schema

```typescript
interface ErrorResponse {
  success: false;
  data:    null;
  message: string;
  code:    string;           // Machine-readable error code
  errors?: FieldError[];     // Present for validation failures
}

interface FieldError {
  field:  string;
  issue:  string;
}
```

### 11.2 HTTP Status Code Reference

| Status | Meaning                  | Common Scenarios in SiJurnalPKL                 |
|--------|--------------------------|-------------------------------------------------|
| `200`  | OK                       | Successful GET, PATCH, DELETE                   |
| `201`  | Created                  | Successful POST (new resource)                  |
| `400`  | Bad Request              | Validation failure, business rule violation     |
| `401`  | Unauthorized             | Missing or invalid JWT                          |
| `403`  | Forbidden                | Valid JWT but insufficient role or cross-data access |
| `404`  | Not Found                | Entity does not exist                           |
| `409`  | Conflict                 | Duplicate resource (unique constraint violation)|
| `422`  | Unprocessable Entity     | **Geofencing radius failure (WFO outside radius)** |
| `429`  | Too Many Requests        | Rate limit exceeded                             |
| `500`  | Internal Server Error    | Unhandled exception                             |
| `503`  | Service Unavailable      | n8n or OpenRouter unreachable                   |

### 11.3 `403 Forbidden` — Detailed Examples

**Cross-role access:**
```json
{
  "success": false,
  "data":    null,
  "message": "Access denied. This endpoint requires role: MENTOR.",
  "code":    "INSUFFICIENT_ROLE"
}
```

**Cross-data access (student accessing another student's data):**
```json
{
  "success": false,
  "data":    null,
  "message": "Access denied. You are not authorized to access this resource.",
  "code":    "CROSS_DATA_ACCESS"
}
```

**Activation gate:**
```json
{
  "success": false,
  "data":    null,
  "message": "Account not activated. Please change your password first.",
  "code":    "ACCOUNT_NOT_ACTIVATED"
}
```

### 11.4 `422 Unprocessable Entity` — Geofencing Failure

```json
{
  "success": false,
  "data": {
    "distance_from_industry": 542.7,
    "allowed_radius_meter":   200,
    "excess_meters":          342.7,
    "work_type":              "WFO",
    "industry_name":          "PT. Teknologi Nusantara"
  },
  "message": "Check-in rejected. Your location is 342.7 meters beyond the allowed radius.",
  "code":    "OUTSIDE_RADIUS"
}
```

---

## 12. TypeScript Interfaces Reference

### 12.1 Core Enums

```typescript
enum Role             { STUDENT = "STUDENT", MENTOR = "MENTOR", TEACHER = "TEACHER", ADMIN = "ADMIN" }
enum PklStatus        { ACTIVE = "ACTIVE", FINISHED = "FINISHED", NOT_STARTED = "NOT_STARTED" }
enum PlacementStatus  { ACTIVE = "ACTIVE", FINISHED = "FINISHED", NOT_STARTED = "NOT_STARTED" }
enum WorkType         { WFO = "WFO", WFA = "WFA" }
enum AttendanceStatus { PRESENT = "PRESENT", LATE = "LATE", ABSENT = "ABSENT", LEAVE = "LEAVE", ALPHA = "ALPHA" }
enum GpsStatus        { VALID = "VALID", WARNING = "WARNING", INVALID = "INVALID" }
enum AiStatus         { PENDING = "PENDING", SUCCESS = "SUCCESS", FAILED = "FAILED" }
enum ApprovalStatus   { PENDING = "PENDING", APPROVED = "APPROVED", REJECTED = "REJECTED" }
enum LeaveType        { SICK = "SICK", PERSONAL = "PERSONAL" }
enum LeaveStatus      { PENDING = "PENDING", APPROVED = "APPROVED", REJECTED = "REJECTED", CONVERTED_TO_ALPHA = "CONVERTED_TO_ALPHA" }
enum RecommendationStatus { ELIGIBLE = "ELIGIBLE", NOT_ELIGIBLE = "NOT_ELIGIBLE", PENDING_EVALUATION = "PENDING_EVALUATION", BLOCKED = "BLOCKED" }
```

### 12.2 Entity Response Objects

```typescript
interface UserDTO {
  id:              string;
  name:            string;
  email:           string;
  whatsapp_number: string;
  role:            Role;
  activated:       boolean;
  created_at:      string;
}

interface AttendanceLogDTO {
  attendance_id:            string;
  student_id:               string;
  placement_id:             string;
  work_date:                string;
  work_type:                WorkType;
  check_in_time:            string;
  check_out_time:           string | null;
  latitude:                 number | null;
  longitude:                number | null;
  distance_from_industry:   number | null;
  check_in_photo_url:       string;
  check_out_photo_url:      string | null;
  gps_status:               GpsStatus;
  gps_accuracy:             number | null;
  gps_attempt_count:        number;
  status_attendance:        AttendanceStatus;
  created_at:               string;
}

interface DailyLogDTO {
  daily_id:        string;
  attendance_id:   string;
  raw_text:        string;
  processed_text:  string | null;
  skill_tags:      string[];
  ai_status:       AiStatus;
  approval_status: ApprovalStatus;
  approved_by:     string | null;
  approved_at:     string | null;
  created_at:      string;
}

interface LeaveRequestDTO {
  leave_id:    string;
  student_id:  string;
  placement_id:string;
  leave_date:  string;
  type:        LeaveType;
  reason:      string;
  status:      LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at:  string;
}

interface PlacementDTO {
  placement_id: string;
  student_id:   string;
  industry_id:  string;
  start_date:   string;
  end_date:     string;
  status:       PlacementStatus;
}

interface IndustryDTO {
  industry_id:  string;
  name:         string;
  address:      string;
  latitude:     number;
  longitude:    number;
  radius_meter: number;
}

interface AuditLogDTO {
  audit_id:    string;
  target_type: string;
  target_id:   string;
  changed_by:  string;
  from_status: string;
  to_status:   string;
  reason:      string | null;
  changed_at:  string;
}

interface IndustryEvaluationDTO {
  evaluation_id:       string;
  mentor_id:           string;
  placement_id:        string;
  discipline_score:    number;
  technical_score:     number;
  communication_score: number;
  teamwork_score:      number;
  notes:               string;
  submitted_at:        string;
}
```

### 12.3 JWT Payload

```typescript
interface JwtPayload {
  sub:        string;  // user_id
  role:       Role;
  activated:  boolean;
  school_id?: string;  // Present for STUDENT, TEACHER, ADMIN
  industry_id?: string; // Present for MENTOR
  iat:        number;  // Issued at
  exp:        number;  // Expiry
}
```

---

*Documentation Version: 1.0.0 | Last Updated: 2026-03-07 | Team: CC26-PS058*
