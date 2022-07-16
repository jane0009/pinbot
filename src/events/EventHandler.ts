import { Context } from "../context";

export type ListenerFn<T> = (ctx: Context, event: T) => void;

export class EventHandler<T> {
  listeners: ListenerFn<T>[] = [];
  register_listener(callback: ListenerFn<T>) {
    this.listeners.push(callback);
  }
  handle_event(ctx: Context, event: T) {
    this.listeners.forEach(
      listener => {
        listener(ctx, event);
      }
    );
  }
}