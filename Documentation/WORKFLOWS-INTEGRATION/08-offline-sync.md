# Offline Sync Workflow

**Pattern**: Queue → Sync → Resolve Conflicts  
**Storage**: IndexedDB (browser)  
**Resilience**: Network-agnostic POS  

---

## **INDEXEDDB SETUP**

```typescript
// lib/offline/db.ts
import { openDB, DBSchema } from 'idb';

interface NerdPOSDB extends DBSchema {
  orders: {
    key: string;
    value: Order;
    indexes: { 'by-status': string };
  };
  queue: {
    key: string;
    value: QueuedRequest;
    indexes: { 'by-timestamp': number };
  };
  products: {
    key: string;
    value: Product;
  };
  customers: {
    key: string;
    value: Customer;
  };
}

export const db = await openDB<NerdPOSDB>('nerdpos-db', 1, {
  upgrade(db) {
    // Orders store
    const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
    orderStore.createIndex('by-status', 'status');

    // Queue store
    const queueStore = db.createObjectStore('queue', { keyPath: 'id' });
    queueStore.createIndex('by-timestamp', 'timestamp');

    // Products store
    db.createObjectStore('products', { keyPath: 'id' });

    // Customers store
    db.createObjectStore('customers', { keyPath: 'id' });
  },
});
```

---

## **QUEUE MANAGER**

```typescript
// lib/offline/queue.ts
import { db } from './db';
import { v4 as uuid } from 'uuid';

export class OfflineQueue {
  async addRequest(method: string, url: string, data: any) {
    const request = {
      id: uuid(),
      method,
      url,
      data,
      timestamp: Date.now(),
      attempts: 0,
      status: 'PENDING',
    };

    await db.add('queue', request);
    
    // Try immediate sync if online
    if (navigator.onLine) {
      await this.syncQueue();
    }
  }

  async syncQueue() {
    const pending = await db.getAllFromIndex('queue', 'by-timestamp');
    
    for (const request of pending) {
      try {
        // Attempt to send request
        const response = await fetch(request.url, {
          method: request.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request.data),
        });

        if (response.ok) {
          // Success - remove from queue
          await db.delete('queue', request.id);
          
          // Update local state
          const result = await response.json();
          await this.updateLocalRecord(request, result);
          
        } else {
          // Server error - increment attempts
          await db.put('queue', {
            ...request,
            attempts: request.attempts + 1,
            lastError: await response.text(),
          });
        }
        
      } catch (error) {
        // Network error - keep in queue
        await db.put('queue', {
          ...request,
          attempts: request.attempts + 1,
          lastError: error.message,
        });
      }
    }
  }

  async updateLocalRecord(request: QueuedRequest, serverData: any) {
    // Update local database with server response
    if (request.url.includes('/orders')) {
      await db.put('orders', serverData);
    }
    // ... other entities
  }
}

export const offlineQueue = new OfflineQueue();
```

---

## **OFFLINE-AWARE API CLIENT**

```typescript
// lib/api/offline-client.ts
import { apiClient } from './client';
import { offlineQueue } from '../offline/queue';
import { db } from '../offline/db';

export async function createOrder(orderData: CreateOrderDto) {
  if (navigator.onLine) {
    // Online - normal request
    try {
      const response = await apiClient.post('/orders', orderData);
      
      // Cache in IndexedDB
      await db.put('orders', response.data);
      
      return response.data;
      
    } catch (error) {
      // Server error - fallback to offline
      return createOrderOffline(orderData);
    }
    
  } else {
    // Offline - create locally and queue
    return createOrderOffline(orderData);
  }
}

async function createOrderOffline(orderData: CreateOrderDto) {
  // Generate temporary ID
  const tempId = `temp-${uuid()}`;
  
  const order = {
    ...orderData,
    id: tempId,
    orderNumber: `OFFLINE-${Date.now()}`,
    status: 'PENDING_SYNC',
    createdAt: new Date(),
    synced: false,
  };

  // Save locally
  await db.add('orders', order);

  // Add to sync queue
  await offlineQueue.addRequest('POST', '/orders', order);

  return order;
}
```

---

## **SYNC SERVICE**

```typescript
// lib/offline/sync.ts
import { db } from './db';
import { apiClient } from '../api/client';

export class SyncService {
  private syncInProgress = false;

  async fullSync() {
    if (this.syncInProgress) return;
    
    this.syncInProgress = true;

    try {
      // 1. Sync queue first (pending operations)
      await offlineQueue.syncQueue();

      // 2. Fetch latest data from server
      await this.syncProducts();
      await this.syncCustomers();
      await this.syncOrders();

      // 3. Mark sync timestamp
      localStorage.setItem('lastSyncAt', new Date().toISOString());
      
    } finally {
      this.syncInProgress = false;
    }
  }

  async syncProducts() {
    const lastSync = localStorage.getItem('lastSyncAt');
    
    const response = await apiClient.get('/products', {
      params: { updatedAfter: lastSync },
    });

    for (const product of response.data) {
      await db.put('products', product);
    }
  }

  async syncOrders() {
    // Fetch orders created while offline
    const localOrders = await db.getAllFromIndex('orders', 'by-status', 'PENDING_SYNC');

    for (const order of localOrders) {
      try {
        // Send to server
        const response = await apiClient.post('/orders', order);

        // Update with server ID
        await db.delete('orders', order.id);
        await db.put('orders', {
          ...response.data,
          synced: true,
        });
        
      } catch (error) {
        console.error('Failed to sync order:', order.id, error);
      }
    }
  }
}

export const syncService = new SyncService();
```

---

## **CONFLICT RESOLUTION**

```typescript
// Handle conflicts when both client and server modified same record
async resolveConflict(localOrder: Order, serverOrder: Order) {
  // Strategy 1: Server wins (default)
  if (strategy === 'SERVER_WINS') {
    await db.put('orders', serverOrder);
    return serverOrder;
  }

  // Strategy 2: Client wins
  if (strategy === 'CLIENT_WINS') {
    await apiClient.put(`/orders/${serverOrder.id}`, localOrder);
    return localOrder;
  }

  // Strategy 3: Merge (complex)
  if (strategy === 'MERGE') {
    const merged = {
      ...serverOrder,
      items: mergeItems(localOrder.items, serverOrder.items),
      notes: `${localOrder.notes}\n[Server]: ${serverOrder.notes}`,
    };
    
    await apiClient.put(`/orders/${serverOrder.id}`, merged);
    await db.put('orders', merged);
    
    return merged;
  }
}
```

---

## **REACT HOOK**

```tsx
// hooks/useOffline.ts
import { useEffect, useState } from 'react';
import { syncService } from '@/lib/offline/sync';

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      
      // Trigger sync when coming back online
      await syncService.fullSync();
      updateQueueSize();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateQueueSize = async () => {
    const queue = await db.getAll('queue');
    setQueueSize(queue.length);
  };

  return { isOnline, queueSize };
}
```

---

## **UI INDICATOR**

```tsx
export function OfflineIndicator() {
  const { isOnline, queueSize } = useOfflineStatus();

  if (isOnline && queueSize === 0) return null;

  return (
    <div className={`fixed top-4 right-4 glass-card ${isOnline ? 'bg-yellow-100' : 'bg-red-100'}`}>
      {!isOnline && (
        <div className="flex items-center gap-2">
          <WifiOff className="h-5 w-5" />
          <span>Offline Mode</span>
        </div>
      )}
      
      {queueSize > 0 && (
        <p className="text-sm mt-1">
          {queueSize} items queued for sync
        </p>
      )}
    </div>
  );
}
```

---

**Integration Workflows Complete ✅**
