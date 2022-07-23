import on_ready from "./ready";
import { EventHandler } from "./EventHandler";
import { Interaction, Message } from "eris";
import { on_interaction_create } from "./interaction";
import { on_message_create } from "./message";

export const messageCreate = new EventHandler<Message>();
messageCreate.register_listener(on_message_create);
export const ready = new EventHandler<undefined>();
ready.register_listener(on_ready);
export const interactionCreate = new EventHandler<Interaction>();
interactionCreate.register_listener(on_interaction_create);