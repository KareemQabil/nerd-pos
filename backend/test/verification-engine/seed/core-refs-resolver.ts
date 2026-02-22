import { getHttp } from '../runtime/test-context';

type LoginResult = {
  token: string;
  user: {
    id: string;
    username: string;
    role: string;
    roleId?: string;
  };
};

type LookupItem = {
  id: string;
  nameEn?: string;
  nameAr?: string;
  active?: boolean;
  metadata?: Record<string, unknown>;
};

export type CoreRefs = {
  admin: LoginResult['user'] & { token: string };
  cashier?: (LoginResult['user'] & { token: string }) | null;
  warehouse: {
    id: string;
    nameEn?: string;
    nameAr?: string;
    code?: string;
    isDefault?: boolean;
  };
  products: Array<{
    id: string;
    nameEn?: string;
    nameAr?: string;
    sku?: string;
    price?: string;
  }>;
};

let refsPromise: Promise<CoreRefs> | null = null;

const unwrapResult = (body: any) => body?.result ?? body?.data ?? body;

const loginUser = async (
  username: string,
  password: string,
  label: string,
  allowFailure = false,
): Promise<LoginResult | null> => {
  const http = await getHttp();
  const response = await http.post('/api/v1/auth/login').send({
    username,
    password,
  });

  if (response.status !== 200 && response.status !== 201) {
    if (allowFailure) {
      return null;
    }
    throw new Error(
      `${label} login failed: ${response.status} ${JSON.stringify(
        response.body,
      )}`,
    );
  }

  const data = unwrapResult(response.body);
  const token = data?.access_token || data?.token;
  const user = data?.user;

  if (!token || !user?.id) {
    if (allowFailure) {
      return null;
    }
    throw new Error(`${label} login missing token or user payload.`);
  }

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      roleId: user.roleId,
    },
  };
};

const fetchLookup = async (
  path: string,
  token: string,
  query: Record<string, string | number> = {},
): Promise<LookupItem[]> => {
  const http = await getHttp();
  const response = await http
    .get(`/api/v1/lookup/${path}`)
    .set('Authorization', `Bearer ${token}`)
    .query(query);

  if (response.status !== 200) {
    throw new Error(
      `Lookup ${path} failed: ${response.status} ${JSON.stringify(
        response.body,
      )}`,
    );
  }

  const data = unwrapResult(response.body);
  if (!Array.isArray(data)) {
    throw new Error(`Lookup ${path} returned unexpected payload.`);
  }

  return data as LookupItem[];
};

export const getCoreRefs = async (): Promise<CoreRefs> => {
  if (!refsPromise) {
    refsPromise = (async () => {
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD || 'nerdpos123';
      const cashierUsername = process.env.CASHIER_USERNAME || 'cashier';
      const cashierPassword = process.env.CASHIER_PASSWORD || 'cashier123';

      const adminLogin = await loginUser(
        adminUsername,
        adminPassword,
        'Admin',
      );

      if (!adminLogin) {
        throw new Error('Admin login failed. Verification engine requires admin credentials.');
      }

      const cashierLogin = await loginUser(
        cashierUsername,
        cashierPassword,
        'Cashier',
        true,
      );

      const warehouses = await fetchLookup('warehouses', adminLogin.token, {
        limit: 50,
      });
      if (warehouses.length === 0) {
        throw new Error('No warehouses found via lookup endpoint.');
      }

      const defaultWarehouse =
        warehouses.find(
          (wh) => wh.metadata && (wh.metadata as any).isDefault,
        ) || warehouses[0];

      const products = await fetchLookup('products', adminLogin.token, {
        limit: 50,
      });
      if (products.length === 0) {
        throw new Error('No products found via lookup endpoint.');
      }

      const mappedProducts = products.slice(0, 10).map((product) => ({
        id: product.id,
        nameEn: product.nameEn,
        nameAr: product.nameAr,
        sku:
          typeof product.metadata?.sku === 'string'
            ? (product.metadata.sku as string)
            : undefined,
        price:
          typeof product.metadata?.price === 'string'
            ? (product.metadata.price as string)
            : undefined,
      }));

      return {
        admin: {
          token: adminLogin.token,
          id: adminLogin.user.id,
          username: adminLogin.user.username,
          role: adminLogin.user.role,
          roleId: adminLogin.user.roleId,
        },
        cashier: cashierLogin
          ? {
              token: cashierLogin.token,
              id: cashierLogin.user.id,
              username: cashierLogin.user.username,
              role: cashierLogin.user.role,
              roleId: cashierLogin.user.roleId,
            }
          : null,
        warehouse: {
          id: defaultWarehouse.id,
          nameEn: defaultWarehouse.nameEn,
          nameAr: defaultWarehouse.nameAr,
          code:
            typeof defaultWarehouse.metadata?.code === 'string'
              ? (defaultWarehouse.metadata.code as string)
              : undefined,
          isDefault: Boolean(defaultWarehouse.metadata?.isDefault),
        },
        products: mappedProducts,
      };
    })();
  }

  return refsPromise;
};

