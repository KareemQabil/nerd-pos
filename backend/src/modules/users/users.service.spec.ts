/**
 * Users Service Unit Tests
 *
 * Tests for authentication, user management, and role/permission handling.
 * Uses repository pattern with bcrypt for password hashing.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtService } from '@nestjs/jwt';
import { UsersRepository } from './users.repository';

function createMockRepository() {
  return {
    // Users
    findByUsername: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    findActive: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    // User with role (for login flow)
    findWithRole: jest.fn(),
    findByRoleLevel: jest.fn(),
    // PIN verification
    findByPin: jest.fn(),
    findManagerByPin: jest.fn(),
    // Auth logs
    createAuthLog: jest.fn(),
    // Roles & Permissions
    findAllRoles: jest.fn(),
    findRoleById: jest.fn(),
    createRole: jest.fn(),
    updateRole: jest.fn(),
    findAllPermissions: jest.fn(),
    findPermissionsByModule: jest.fn(),
    createPermission: jest.fn(),
    findUserPermissions: jest.fn(),
    getPermissions: jest.fn(),
  };
}

function createMockEventBus() {
  return { publish: jest.fn(), subscribe: jest.fn() };
}

const mockUser = {
  id: 'user-1',
  username: 'admin',
  passwordHash: '$2a$10$hashedpassword',
  pin: '1234',
  nameEn: 'Admin User',
  nameAr: 'مدير',
  roleId: 'role-1',
  isActive: true,
  role: { id: 'role-1', name: 'Manager', permissions: [] },
};

const mockRole = {
  id: 'role-1',
  name: 'Manager',
  nameAr: 'مدير',
  permissions: ['products.create', 'products.update'],
};

describe('UsersService', () => {
  let service: UsersService;
  let repo: ReturnType<typeof createMockRepository>;
  let eventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(async () => {
    repo = createMockRepository();
    eventBus = createMockEventBus();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: repo },
        { provide: 'IEventBus', useValue: eventBus },
        { provide: JwtService, useValue: { sign: jest.fn(() => 'token') } },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  // ==================== LOGIN ====================
  describe('login', () => {
    it('should return auth result for valid credentials', async () => {
      repo.findByUsername.mockResolvedValue(mockUser);
      repo.findWithRole.mockResolvedValue(mockUser); // Service calls this for role info
      // Mock bcrypt compare - would normally use spy
      jest.spyOn(service as any, 'verifyPassword').mockResolvedValue(true);

      const result = await service.login('admin', 'password123');

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(eventBus.publish).toHaveBeenCalledWith(
        'UserLoggedIn',
        expect.anything(),
      );
    });

    it('should throw UnauthorizedException for invalid username', async () => {
      repo.findByUsername.mockResolvedValue(null);

      await expect(service.login('invalid', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      repo.findByUsername.mockResolvedValue(mockUser);
      jest.spyOn(service as any, 'verifyPassword').mockResolvedValue(false);

      await expect(service.login('admin', 'wrongpassword')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ==================== PIN VERIFICATION ====================
  describe('verifyPin', () => {
    it('should return true for valid PIN', async () => {
      repo.findById.mockResolvedValue(mockUser);

      const result = await service.verifyPin('user-1', '1234');

      expect(result).toBe(true);
    });

    it('should return false for invalid PIN', async () => {
      repo.findById.mockResolvedValue(mockUser);

      const result = await service.verifyPin('user-1', '9999');

      expect(result).toBe(false);
    });
  });

  describe('verifyManagerPin', () => {
    it('should return valid with managerId for manager PIN', async () => {
      // Service uses findByRoleLevel(2) to get managers, then checks PIN
      repo.findByRoleLevel.mockResolvedValue([mockUser]);

      const result = await service.verifyManagerPin('1234');

      expect(result.valid).toBe(true);
      expect(result.managerId).toBe('user-1');
    });

    it('should return invalid for non-manager PIN', async () => {
      repo.findByRoleLevel.mockResolvedValue([]);

      const result = await service.verifyManagerPin('9999');

      expect(result.valid).toBe(false);
    });
  });

  // ==================== USER CRUD ====================
  describe('createUser', () => {
    it('should create user with hashed password', async () => {
      repo.create.mockImplementation((data) =>
        Promise.resolve({ id: 'new', ...data }),
      );
      jest.spyOn(service as any, 'hashPassword').mockResolvedValue('hashedpw');

      const result = await service.createUser({
        username: 'newuser',
        password: 'password123',
        nameEn: 'New User',
        nameAr: 'مستخدم جديد',
        roleId: 'role-1',
        role: 'CASHIER',
      });

      expect(result.id).toBeDefined();
      expect(eventBus.publish).toHaveBeenCalledWith(
        'UserCreated',
        expect.anything(),
      );
    });
  });

  describe('findById', () => {
    it('should return user profile', async () => {
      // Service uses findWithRole, not findById
      repo.findWithRole.mockResolvedValue(mockUser);

      const result = await service.findById('user-1');

      expect(result.username).toBe('admin');
    });

    it('should throw NotFoundException if user not found', async () => {
      repo.findWithRole.mockResolvedValue(null);

      await expect(service.findById('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      // Service calls findActive(), not findAll()
      repo.findActive.mockResolvedValue([mockUser, { ...mockUser, id: 'user-2' }]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
    });
  });

  // ==================== ROLES ====================
  describe('getAllRoles', () => {
    it('should return all roles', async () => {
      repo.findAllRoles.mockResolvedValue([mockRole]);

      const result = await service.getAllRoles();

      expect(result).toHaveLength(1);
    });
  });

  describe('createRole', () => {
    it('should create role with permissions', async () => {
      repo.createRole.mockResolvedValue(mockRole);

      const result = await service.createRole({
        name: 'New Role',
        nameAr: 'دور جديد',
        permissionIds: ['perm-1'],
        level: 5,
      });

      expect(result.name).toBe('Manager');
    });
  });

  // ==================== PERMISSIONS ====================
  describe('hasPermission', () => {
    it('should return true if user has permission', async () => {
      // Service uses findWithRole then getPermissions
      repo.findWithRole.mockResolvedValue(mockUser);
      repo.getPermissions.mockResolvedValue([
        { code: 'products.create' },
        { code: 'products.update' },
      ]);

      const result = await service.hasPermission('user-1', 'products.create');

      expect(result).toBe(true);
    });

    it('should return false if user lacks permission', async () => {
      repo.findWithRole.mockResolvedValue(mockUser);
      repo.getPermissions.mockResolvedValue([{ code: 'products.view' }]);

      const result = await service.hasPermission('user-1', 'products.delete');

      expect(result).toBe(false);
    });
  });

  describe('getAllPermissions', () => {
    it('should return all permissions', async () => {
      repo.findAllPermissions.mockResolvedValue([
        { code: 'products.create', module: 'products' },
        { code: 'products.update', module: 'products' },
      ]);

      const result = await service.getAllPermissions();

      expect(result).toHaveLength(2);
    });
  });

  describe('getPermissionsByModule', () => {
    it('should return permissions for specific module', async () => {
      repo.findPermissionsByModule.mockResolvedValue([
        { code: 'products.create', module: 'products' },
      ]);

      const result = await service.getPermissionsByModule('products');

      expect(result).toHaveLength(1);
      expect(repo.findPermissionsByModule).toHaveBeenCalledWith('products');
    });
  });
});
