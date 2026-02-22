import { mintAdminToken, mintCashierToken } from './token-minter';

export const asAdmin = async (): Promise<{ Authorization: string }> => ({
  Authorization: `Bearer ${await mintAdminToken()}`,
});

export const asCashier = async (): Promise<{ Authorization: string }> => ({
  Authorization: `Bearer ${await mintCashierToken()}`,
});
