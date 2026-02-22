import { config as loadEnv } from 'dotenv';
import { closeTestApp } from './runtime/test-app';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

jest.setTimeout(120000);

afterAll(async () => {
  await closeTestApp();
});
