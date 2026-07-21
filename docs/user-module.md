# User Module Documentation

The **User Module** handles user registration, authentication (trusted device session & 2FA email OTP), and login verification.

---

## Endpoints

### 1. Register User
`POST /user/register`

Creates a new user account, initializes a session, sets HTTP-only cookies, and returns the initial session state and access token.

#### Request Body (`RegisterUserDto`)
```json
{
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "password": "P@ssw0rd123!"
}
```
*Validation*:
- `name`: String, required, 2-50 characters.
- `email`: String, required, valid email format.
- `password`: String, required, minimum 8 characters.

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

---

### 2. Login User
`POST /user/login`

Authenticates user credentials and checks for existing active sessions from the same IP address (device trust check).

#### Request Body (`LoginUserDto`)
```json
{
  "email": "jane.doe@example.com",
  "password": "P@ssw0rd123!"
}
```

#### Response Scenarios (`200 OK`)

##### Scenario A: Trusted Device (Existing Session Match)
Set HTTP-only cookies (`happydada`, `hayyya`) and return:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

##### Scenario B: Untrusted Device (New Device / Untrusted IP)
Generates a 6-digit OTP code, saves it to database, attempts sending OTP via email, and instructs frontend to show OTP flow:
```json
{
  "requireOtp": true,
  "emailSentStatus": "success"
}
```
*(Note: `emailSentStatus` is `"success"` or `"failed"`)*

---

### 3. Verify Login OTP
`POST /user/verify-login-otp`

Confirms the 6-digit OTP code sent to user's email during an untrusted device login.

#### Request Body (`VerifyLoginOtpDto`)
```json
{
  "email": "jane.doe@example.com",
  "code": "123456"
}
```

#### Response (`200 OK`)
Deletes the used OTP record, creates a new session, sets HTTP-only cookies (`happydada`, `hayyya`), and returns:
```json
{
  "user_data": { ... },
  "session": { ... },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Error Responses (`400 Bad Request`)
- `Invalid request` (user not found)
- `Invalid or expired OTP code`
- `OTP code has expired`
