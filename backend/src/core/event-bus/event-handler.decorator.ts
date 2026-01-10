// Event Handler Decorator
// Source: FINAL/BACKEND/02-CORE-PATTERNS.md

import { SetMetadata } from '@nestjs/common';

export const EVENT_HANDLER_METADATA = 'eventHandler';

export const EventHandler = (eventName: string): ClassDecorator => {
    return SetMetadata(EVENT_HANDLER_METADATA, eventName);
};
