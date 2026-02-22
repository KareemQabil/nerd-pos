export const catalogKeys = {
  products: () => ['catalog', 'products'] as const,
  categories: () => ['catalog', 'categories'] as const,
  modifiers: () => ['catalog', 'modifiers'] as const,
};

export const lookupKeys = {
  core: () => ['lookup', 'core'] as const,
};

export const settingsKeys = {
  store: () => ['settings', 'store'] as const,
};
