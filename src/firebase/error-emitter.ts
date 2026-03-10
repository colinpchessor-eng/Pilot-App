import { EventEmitter } from 'events';
import { type FirestorePermissionError } from '@/firebase/errors';

type Events = {
  'permission-error'(error: FirestorePermissionError): void;
};

// Strongly type the event emitter
declare interface ErrorEventEmitter {
  on<U extends keyof Events>(event: U, listener: Events[U]): this;
  emit<U extends keyof Events>(event: U, ...args: Parameters<Events[U]>): boolean;
}

class ErrorEventEmitter extends EventEmitter {}

export const errorEmitter = new ErrorEventEmitter();
