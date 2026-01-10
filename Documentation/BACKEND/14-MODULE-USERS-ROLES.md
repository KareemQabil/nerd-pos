# Users and Roles Module Implementation

**Module**: Users, Roles, Permissions, Authentication  
**Priority**: Critical (Security foundation)  
**Dependencies**: None (Base module)

---

## **OVERVIEW**

Authentication and authorization system:
- **Users** - Staff accounts with credentials
- **Roles** - Admin, Manager, Cashier, Waiter, Kitchen
- **Permissions** - Granular access control
- **Manager PIN** - Quick authorization for sensitive operations

---

## **ENTITIES**

```prisma
model User {
  id            String   @id @default(uuid())
  username      String   @unique
  email         String?  @unique
  
  // Authentication
  passwordHash  String
  pin           String?  // 4-6 digit PIN for quick auth
  
  // Profile
  firstName     String
  lastName      String
  phone         String?
  
  // Role
  roleId        String
  role          Role     @relation(fields: [roleId], references: [id])
  
  // Session tracking
  currentSessionId String?
  
  // Status
  isActive      Boolean  @default(true)
  lastLoginAt   DateTime?
  
  // Audit
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  createdBy     String?
  
  @@index([username])
  @@index([roleId])
}

model Role {
  id            String   @id @default(uuid())
  name          String   @unique // ADMIN, MANAGER, CASHIER, WAITER, KITCHEN_STAFF
  nameAr        String
  description   String?
  
  // Permissions
  permissions   RolePermission[]
  
  // Users
  users         User[]
  
  // Hierarchy
  level         Int      // 1=ADMIN, 2=MANAGER, 3=CASHIER, 4=WAITER, 5=KITCHEN
  
  isSystem      Boolean  @default(false) // System roles cannot be deleted
  isActive      Boolean  @default(true)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([level])
}

model Permission {
  id            String   @id @default(uuid())
  code          String   @unique // "sales.create", "inventory.adjust"
  name          String
  nameAr        String
  description   String?
  
  // Grouping
  module        String   // "sales", "inventory", "settings"
  section       String?  // "orders", "products"
  
  // Roles
  roles         RolePermission[]
  
  createdAt     DateTime @default(now())
  
  @@index([module])
}

model RolePermission {
  roleId        String
  role          Role       @relation(fields: [roleId], references: [id])
  
  permissionId  String
  permission    Permission @relation(fields: [permissionId], references: [id])
  
  assignedAt    DateTime   @default(now())
  assignedBy    String
  
  @@id([roleId, permissionId])
}

model AuthenticationLog {
  id            String   @id @default(uuid())
  userId        String
  
  // Auth details
  method        String   // PASSWORD, PIN
  success       Boolean
  failureReason String?
  
  // Request details
  ipAddress     String?
  userAgent     String?
  
  createdAt     DateTime @default(now())
  
  @@index([userId])
  @@index([createdAt])
}
```

---

## **SERVICE**

```typescript
// users.service.ts
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly roleRepo: RoleRepository,
    private readonly jwtService: JwtService,
    private readonly eventBus: IEventBus
  ) {}

  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    const user = await this.userRepo.findByUsername(username);
    
    if (!user || !user.isActive) {
      await this.logAuthAttempt(user?.id, 'PASSWORD', false, 'Invalid credentials');
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValid) {
      await this.logAuthAttempt(user.id, 'PASSWORD', false, 'Invalid password');
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.logAuthAttempt(user.id, 'PASSWORD', true);
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    const token = this.jwtService.sign({
      sub: user.id,
      username: user.username,
      roleId: user.roleId
    });

    await this.eventBus.publish('UserLoggedIn',
      new UserLoggedInEvent(user.id, user.username)
    );

    return { token, user };
  }

  async verifyPin(userId: string, pin: string): Promise<boolean> {
    const user = await this.userRepo.findById(userId);
    
    if (!user || !user.pin) {
      await this.logAuthAttempt(userId, 'PIN', false, 'No PIN set');
      return false;
    }

    const isValid = user.pin === pin;
    
    await this.logAuthAttempt(userId, 'PIN', isValid, isValid ? null : 'Invalid PIN');
    
    return isValid;
  }

  async verifyManagerPin(pin: string): Promise<{ valid: boolean; managerId?: string }> {
    const managers = await this.userRepo.findByRoleLevel(2); // MANAGER level
    
    for (const manager of managers) {
      if (manager.pin === pin && manager.isActive) {
        await this.logAuthAttempt(manager.id, 'PIN', true);
        return { valid: true, managerId: manager.id };
      }
    }

    return { valid: false };
  }

  async createUser(dto: CreateUserDto): Promise<User> {
    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.userRepo.create({
      username: dto.username,
      email: dto.email,
      passwordHash,
      pin: dto.pin,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      roleId: dto.roleId,
      isActive: true,
      createdBy: dto.createdBy
    });

    await this.eventBus.publish('UserCreated',
      new UserCreatedEvent(user.id, user.username, user.roleId)
    );

    return user;
  }

  async hasPermission(userId: string, permissionCode: string): Promise<boolean> {
    const user = await this.userRepo.findWithRole(userId);
    if (!user || !user.role) return false;

    const permissions = await this.roleRepo.getPermissions(user.roleId);
    return permissions.some(p => p.code === permissionCode);
  }

  async updatePin(userId: string, newPin: string): Promise<void> {
    await this.userRepo.update(userId, { pin: newPin });
  }

  private async logAuthAttempt(
    userId: string | undefined,
    method: string,
    success: boolean,
    failureReason?: string
  ): Promise<void> {
    if (!userId) return;

    await this.userRepo.createAuthLog({
      userId,
      method,
      success,
      failureReason
    });
  }
}
```

---

## **CONTROLLER**

```typescript
// users.controller.ts
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.usersService.login(dto.username, dto.password);
  }

  @Post('verify-pin')
  @UseGuards(AuthGuard)
  async verifyPin(@Request() req, @Body() dto: { pin: string }) {
    return this.usersService.verifyPin(req.user.id, dto.pin);
  }

  @Post('manager-auth')
  async verifyManagerPin(@Body() dto: { pin: string }) {
    return this.usersService.verifyManagerPin(dto.pin);
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async create(@Body() dto: CreateUserDto, @Request() req) {
    return this.usersService.createUser({
      ...dto,
      createdBy: req.user.id
    });
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getProfile(@Request() req) {
    return this.usersService.findById(req.user.id);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async getAll() {
    return this.usersService.findAll();
  }

  @Put(':id/pin')
  @UseGuards(AuthGuard)
  async updatePin(
    @Param('id') id: string,
    @Body() dto: { pin: string },
    @Request() req
  ) {
    // Users can only update their own PIN
    if (id !== req.user.id) {
      throw new ForbiddenException();
    }
    return this.usersService.updatePin(id, dto.pin);
  }
}
```

---

## **DTOs**

```typescript
// dto/login.dto.ts
export class LoginDto {
  @IsString()
  username: string;

  @IsString()
  password: string;
}

// dto/create-user.dto.ts
export class CreateUserDto {
  @IsString()
  username: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  @IsNumber String()
  @Length(4, 6)
  pin?: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsUUID()
  roleId: string;

  @IsString()
  createdBy: string;
}

// dto/create-role.dto.ts
export class CreateRoleDto {
  @IsString()
  name: string;

  @IsString()
  nameAr: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  level: number;

  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds: string[];
}
```

---

## **KEY FEATURES**

1. **JWT Authentication** - Secure token-based auth
2. **PIN Authorization** - Quick manager approval
3. **Role-Based Access** - Granular permissions
4. **Role Hierarchy** - Admin > Manager > Cashier > Waiter > Kitchen
5. **Permission System** - Module.action granular control
6. **Auth Logging** - Track login attempts
7. **Password Hashing** - bcrypt security
8. **Session Tracking** - Monitor active users

---

## **NEXT**

- [15-MODULE-DELIVERY.md](15-MODULE-DELIVERY.md) - Delivery zones and drivers
