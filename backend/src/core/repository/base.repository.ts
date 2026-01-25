// Base Repository Pattern
// Source: FINAL/BACKEND/02-CORE-PATTERNS.md
//
// Type-safe repository pattern using Prisma's generated types.
// Eliminates need for `(this.prisma as any)` type casting.

import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  PaginationOptions,
  PaginatedResult,
} from '../interfaces/pagination.interface';

/**
 * Generic delegate type for all Prisma models
 * Provides common CRUD operations shared across all models
 */
type ModelDelegate<T> = {
  findMany: (args?: any) => Promise<T[]>;
  findUnique: (args: { where: { id: string } }) => Promise<T | null>;
  findFirst: (args?: any) => Promise<T | null>;
  create: (args: { data: any }) => Promise<T>;
  update: (args: { where: { id: string }; data: any }) => Promise<T>;
  delete: (args: { where: { id: string } }) => Promise<T>;
  count: (args?: { where?: any }) => Promise<number>;
};

@Injectable()
export abstract class BaseRepository<T> {
  constructor(protected readonly prisma: PrismaClient) {}

  protected abstract get model(): string;

  /**
   * Get typed model delegate
   * Uses Prisma's generated types for type safety
   */
  protected get delegate(): ModelDelegate<T> {
    return (this.prisma as any)[this.model] as ModelDelegate<T>;
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
