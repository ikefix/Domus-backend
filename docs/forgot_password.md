# Forgot & Reset Password Flow Documentation

The forgot password system enables users to reset their password using a 6-digit numeric OTP sent to their email.

---

## Rate Limiting
- `POST /user/forgot-password`: Tightly rate limited to **3 requests per minute** to prevent email OTP spamming.
- `POST /user/reset-password`: Rate limited to **5 requests per minute** to prevent brute-forcing OTP values.

---

## Endpoints

### 1. Request Forgot Password OTP
`POST /user/forgot-password`

Initiates the password reset process by generating a new OTP code, deleting any active forgot password OTPs for the user, and emailing the OTP code.

#### Request Body (`ForgotPasswordDto`)
```json
{
  "email": "jane.doe@example.com"
}
```
*Validation*:
- `email`: String, required, valid email format.

#### Response (`201 Created`)
```json
{
  "emailSentStatus": "success"
}
```
*(Note: `emailSentStatus` is `"success"` or `"failed"`)*

#### Error Responses (`400 Bad Request` or `429 Too Many Requests`)
- `User with this email does not exist`
- `Too Many Requests` (Throttler error)

---

### 2. Reset Password
`POST /user/reset-password`

Verifies the OTP code sent to the email and updates the user's password. It also deletes the OTP record, revokes all active sessions for the user, and immediately establishes a new session on the current device (logging the user in).

#### Request Body (`ResetPasswordDto`)
```json
{
  "email": "jane.doe@example.com",
  "code": "123456",
  "newPassword": "123456"
}
```
*Validation*:
- `email`: String, required, valid email format.
- `code`: String, required, exactly 6 digits.
- `newPassword`: String, required, exactly 6 numeric digits (aligned with password strength requirements).

#### Response (`201 Created`)
**Cookies set**:
- `happydada`: HTTP-only Access Token (15 mins)
- `hayyya`: HTTP-only Refresh Token (7 days)

**Payload**:
```json
{
  "user_data": {
    "id": "clx123456000008l345678901",
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "isOnboarded": false,
    "createdAt": "2026-07-21T15:30:00.000Z",
    "updatedAt": "2026-07-21T15:30:00.000Z"
  },
  "session": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "clx123456000008l345678901",
    "ipAddress": "127.0.0.1",
    "userAgent": "Mozilla/5.0...",
    "createdAt": "2026-07-21T15:30:00.000Z",
    "expiresAt": "2026-07-28T15:30:00.000Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Error Responses (`400 Bad Request` or `429 Too Many Requests`)
- `User with this email does not exist`
- `Invalid or expired OTP code`
- `OTP code has expired`
- `Too Many Requests` (Throttler error)
- Validation errors for constraints (e.g. invalid OTP length, weak password).
