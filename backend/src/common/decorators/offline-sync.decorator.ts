// Offline Sync Decorator
// Source: FINAL/BACKEND/01-MODULE-STRUCTURE.md line 48
// Marks an entity or method with its sync strategy

import { SetMetadata } from '@nestjs/common';

export const OFFLINE_SYNC_STRATEGY = 'OFFLINE_SYNC_STRATEGY';

export type SyncStrategy =
  | 'APPEND_ONLY'
  | 'DELTA_INCREMENT'
  | 'SERVER_AUTHORITY';

export const OfflineSync = (strategy: SyncStrategy) =>
  SetMetadata(OFFLINE_SYNC_STRATEGY, strategy);
