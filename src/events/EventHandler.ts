import { Context } from "../context";

export type ListenerFn = (ctx: Context, ...args) => void;

export class EventHandler {
  listeners: ListenerFn[] = [];
  register_listener(callback: ListenerFn) {
    this.listeners.push(callback);
  }
  handle_event(ctx: Context, ...args) {
    this.listeners.forEach(
      listener => {
        listener(ctx, ...args);
      }
    );
  }
}