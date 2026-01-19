// Repository Interface
// Source: FINAL/BACKEND/01-MODULE-STRUCTURE.md line 27
// Abstract interface for all repositories

export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: any): Promise<T[]>;
  create(data: any): Promise<T>;
  update(id: string, data: any): Promise<T>;
  delete(id: string): Promise<void>;
  count(filter?: any): Promise<number>;
}
