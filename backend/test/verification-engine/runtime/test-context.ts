import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { getTestApp } from './test-app';

export const getApp = async (): Promise<INestApplication> => getTestApp();

export const getPrisma = async (): Promise<PrismaService> => {
  const app = await getTestApp();
  return app.get(PrismaService);
};

export const getJwtService = async (): Promise<JwtService> => {
  const app = await getTestApp();
  return app.get(JwtService);
};

export const getHttp = async () => {
  const app = await getTestApp();
  return request(app.getHttpServer());
};
