// Base Repository Pattern
// Source: FINAL/BACKEND/02-CORE-PATTERNS.md
//
// Type-safe repository pattern using Prisma's generated types.
// Eliminates need for `(this.prisma as any)` type casting.

import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  PaginationOptions,
  PaginatedResult,
} from '../interfaces/pagination.interface';

/**
 * Generic delegate type for all Prisma models
 * Provides common CRUD operations shared across all models
 */
export type PrismaModelDelegates = {
  [K in keyof PrismaClient]: PrismaClient[K] extends {
    findMany: (...args: any) => any;
  }
    ? K
    : never;
}[keyof PrismaClient];

type BaseDelegate = {
  findMany: (args?: any) => any;
  findUnique: (args: any) => any;
  create: (args: any) => any;
  update: (args: any) => any;
  delete: (args: any) => any;
  count: (args?: any) => any;
};

@Injectable()
export abstract class BaseRepository<T, M extends PrismaModelDelegates> {
  constructor(protected readonly prisma: PrismaClient) {}

  protected abstract get model(): M;

  /**
   * Get typed model delegate
   * Uses Prisma's generated types for type safety
   */
  protected get delegate(): BaseDelegate {
    return this.prisma[this.model] as unknown as BaseDelegate;
  }

  async findAll(): Promise<T[]> {
    return this.delegate.findMany();
  }

  async findAllPaginated(
    options: PaginationOptions,
  ): Promise<PaginatedResult<T>> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.delegate.findMany({
        skip,
        take: limit,
      }),
      this.delegate.count(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<T | null> {
    return this.delegate.findUnique({
      where: { id },
    });
  }

  async create(data: any): Promise<T> {
    return this.delegate.create({
      data,
    });
  }

  async update(id: string, data: any): Promise<T> {
    return this.delegate.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.delegate.delete({
      where: { id },
    });
  }

  async count(where?: any): Promise<number> {
    return this.delegate.count({ where });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.delegate.count({
      where: { id },
    });
    return count > 0;
  }
}
