# Auth Module API

Authentication endpoints for login, logout, and profile management.

---

## Endpoints

### POST /api/v1/auth/login

**Permission**: Public (no authentication required)  
**Description**: Authenticates user and sets HTTP-only cookie with JWT token

**Request**:

```json
{
  "username": "admin",
  "password": "nerdpos123"
}
```

**Success Response (201)**:

```json
{
  "result": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-admin-1",
      "username": "admin",
      "nameEn": "System Admin",
      "nameAr": "مدير النظام",
      "role": "ADMIN",
      "roleId": "role-admin",
      "email": "admin@nerdpos.com"
    }
  },
  "error": null
}
```

---

### POST /api/v1/auth/logout

**Permission**: Public (no authentication required)  
**Description**: Clears the auth cookie and logs out the user

**Success Response (200)**:

```json
{
  "result": {
    "message": "Logged out successfully"
  },
  "error": null
}
```

---

### GET /api/v1/auth/profile

**Permission**: Authenticated users  
**Description**: Returns the current authenticated user's profile

**Success Response (200)**:

```json
{
  "result": {
    "id": "user-admin-1",
    "username": "admin",
    "role": "ADMIN",
    "roleId": "role-admin"
  },
  "error": null
}
```

---

## Notes

- Login sets an HTTP-only cookie named `access_token` (24-hour expiration)
- All subsequent requests automatically include this cookie
- Logout clears the cookie
- Rate limiting: 5 login attempts per minute, 10 logout attempts per minute
