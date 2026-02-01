import { Request } from 'express';

export interface JwtPayload {
  sub: string; // User ID
  username: string;
  role: string;
  permissions?: string[];
  iat?: number;
  exp?: number;
}

export interface RequestWithUser extends Request {
  user: JwtPayload;
}
