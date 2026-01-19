// Base Repository Pattern
// Source: FINAL/BACKEND/02-CORE-PATTERNS.md

import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export abstract class BaseRepository<T> {
  constructor(protected readonly prisma: PrismaClient) {}

  protected abstract get model(): string;

  // Helper to get typed model delegate using type assertion
  private get delegate(): any {
    return (this.prisma as any)[this.model];
  }

  async findAll(): Promise<T[]> {
    return this.delegate.findMany();
  }

  async findById(id: string): Promise<T | null> {
    return this.delegate.findUnique({
      where: { id },
    });
  }

  async create(data: Partial<T>): Promise<T> {
    return this.delegate.create({
      data,
    });
  }

  async update(id: string, data: Partial<T>): Promise<T> {
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
