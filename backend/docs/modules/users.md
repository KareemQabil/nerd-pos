# Users Module API

User management, roles, and permissions endpoints.

---

## User Endpoints

### POST /api/v1/users/login

**Permission**: Public  
**Description**: Authenticates user with username and password

**Request**:

```json
{
  "username": "admin",
  "password": "password123"
}
```

**Success Response (200)**:

```json
{
  "result": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr_123",
      "username": "admin",
      "role": "ADMIN"
    }
  },
  "error": null
}
```

---

### POST /api/v1/users/verify-pin

**Permission**: `SESSIONS_OPEN`  
**Description**: Verifies 4-digit PIN for quick authentication

**Request**:

```json
{
  "userId": "usr_123",
  "pin": "1234"
}
```

**Success Response (200)**:

```json
{
  "result": {
    "verified": true
  },
  "error": null
}
```

---

### POST /api/v1/users/manager-auth

**Permission**: `SESSIONS_CLOSE` (Manager+)  
**Description**: Verifies manager PIN for elevated operations

**Request**:

```json
{
  "pin": "5678"
}
```

**Success Response (200)**:

```json
{
  "result": {
    "verified": true
  },
  "error": null
}
```

---

### POST /api/v1/users

**Permission**: `USERS_CREATE` (Admin only)  
**Description**: Creates a new user account

**Request**:

```json
{
  "username": "cashier1",
  "password": "securepass123",
  "roleId": "role-cashier",
  "pin": "1234"
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "usr_456",
    "username": "cashier1",
    "role": "CASHIER",
    "isActive": true
  },
  "error": null
}
```

---

### GET /api/v1/users

**Permission**: `USERS_VIEW` (Manager+)  
**Description**: Returns paginated list of users

**Query Parameters**:

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Success Response (200)**:

```json
{
  "result": {
    "data": [
      {
        "id": "usr_123",
        "username": "admin",
        "role": "ADMIN",
        "isActive": true
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 10
  },
  "error": null
}
```

---

### GET /api/v1/users/:id

**Permission**: `USERS_VIEW` (Manager+ or self)  
**Description**: Returns user details. Users can view their own profile, Manager+ can view all

**Success Response (200)**:

```json
{
  "result": {
    "id": "usr_123",
    "username": "admin",
    "role": "ADMIN",
    "permissions": ["*"]
  },
  "error": null
}
```

---

### PUT /api/v1/users/:id

**Permission**: `USERS_UPDATE` (Admin or self)  
**Description**: Updates user information

**Request**:

```json
{
  "nameEn": "Updated Name",
  "nameAr": "اسم محدث",
  "email": "newemail@example.com"
}
```

**Success Response (200)**:

```json
{
  "result": {
    "id": "usr_123",
    "username": "admin",
    "nameEn": "Updated Name",
    "nameAr": "اسم محدث"
  },
  "error": null
}
```

---

### PUT /api/v1/users/:id/pin

**Permission**: `USERS_PIN_UPDATE` (Self or Admin)  
**Description**: Updates user's 4-digit PIN

**Request**:

```json
{
  "newPin": "9876"
}
```

**Success Response (200)**:

```json
{
  "result": {
    "message": "PIN updated successfully"
  },
  "error": null
}
```

---

### POST /api/v1/users/:id/change-password

**Permission**: `USERS_PASSWORD_CHANGE` (Self or Admin)  
**Description**: Changes user password

**Request**:

```json
{
  "currentPassword": "oldpass123",
  "newPassword": "newpass456"
}
```

**Success Response (200)**:

```json
{
  "result": {
    "message": "Password changed successfully"
  },
  "error": null
}
```

---

### GET /api/v1/users/:id/permissions/:code

**Permission**: `PERMISSIONS_VIEW` (Admin only)  
**Description**: Checks if user has specific permission

**Success Response (200)**:

```json
{
  "result": {
    "hasPermission": true
  },
  "error": null
}
```

---

## Role Endpoints

### GET /api/v1/users/roles

**Permission**: `ROLES_VIEW` (Manager+)  
**Description**: Returns all roles with permissions

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "role_admin",
      "name": "ADMIN",
      "description": "Administrator with full access",
      "permissions": ["*"]
    },
    {
      "id": "role_manager",
      "name": "MANAGER",
      "description": "Store manager",
      "permissions": ["sales.*", "products.*", "users.view"]
    }
  ],
  "error": null
}
```

---

### POST /api/v1/users/roles

**Permission**: `ROLES_MANAGE` (Admin only)  
**Description**: Creates a new role

**Request**:

```json
{
  "name": "SUPERVISOR",
  "description": "Shift supervisor",
  "permissions": ["sales.view", "sales.create"]
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "role_supervisor",
    "name": "SUPERVISOR",
    "description": "Shift supervisor",
    "permissions": ["sales.view", "sales.create"]
  },
  "error": null
}
```

---

### PUT /api/v1/users/roles/:id

**Permission**: `ROLES_MANAGE` (Admin only)  
**Description**: Updates role and permissions

**Request**:

```json
{
  "description": "Updated description",
  "permissions": ["sales.*", "products.view"]
}
```

**Success Response (200)**:

```json
{
  "result": {
    "id": "role_supervisor",
    "name": "SUPERVISOR",
    "description": "Updated description",
    "permissions": ["sales.*", "products.view"]
  },
  "error": null
}
```

---

## Permission Endpoints

### GET /api/v1/users/permissions

**Permission**: `PERMISSIONS_VIEW` (Admin only)  
**Description**: Returns all system permissions

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "perm_1",
      "code": "products.create",
      "description": "Create products",
      "module": "products"
    },
    {
      "id": "perm_2",
      "code": "sales.view",
      "description": "View sales",
      "module": "sales"
    }
  ],
  "error": null
}
```

---

### GET /api/v1/users/permissions/module/:module

**Permission**: `PERMISSIONS_VIEW` (Admin only)  
**Description**: Returns permissions for specific module

**Example**: `GET /api/v1/users/permissions/module/products`

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "perm_1",
      "code": "products.create",
      "description": "Create products",
      "module": "products"
    },
    {
      "id": "perm_2",
      "code": "products.update",
      "description": "Update products",
      "module": "products"
    }
  ],
  "error": null
}
```

---

### POST /api/v1/users/permissions

**Permission**: `PERMISSIONS_ASSIGN` (Admin only)  
**Description**: Creates a new permission

**Request**:

```json
{
  "code": "reports.export",
  "description": "Export reports",
  "module": "reports"
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "perm_new",
    "code": "reports.export",
    "description": "Export reports",
    "module": "reports"
  },
  "error": null
}
```

---

## Notes

- **Self-ownership**: Users can view/edit their own profile even without Manager permissions
- **Role hierarchy**: ADMIN > MANAGER > CASHIER
- **PIN format**: 4-digit numeric string
- **Password requirements**: Minimum 8 characters (enforced by validation)
