import { getCoreRefs } from '../seed/core-refs-resolver';

let adminTokenCache: string | null = null;
let cashierTokenCache: string | null = null;

export const mintAdminToken = async (): Promise<string> => {
  if (!adminTokenCache) {
    const refs = await getCoreRefs();
    adminTokenCache = refs.admin.token;
  }
  return adminTokenCache;
};

export const mintCashierToken = async (): Promise<string> => {
  if (!cashierTokenCache) {
    const refs = await getCoreRefs();
    cashierTokenCache = refs.cashier?.token ?? refs.admin.token;
  }
  return cashierTokenCache;
};
