// Event Handler Decorator (moved to decorators subfolder)
// Source: FINAL/BACKEND/01-MODULE-STRUCTURE.md line 22

import { SetMetadata } from '@nestjs/common';

export const EVENT_HANDLER_METADATA = 'EVENT_HANDLER_METADATA';

export const EventHandler = (eventName: string) =>
    SetMetadata(EVENT_HANDLER_METADATA, eventName);
