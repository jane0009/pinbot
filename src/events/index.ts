import OnReady from "./ready";
import { EventHandler } from "./EventHandler";
import { Interaction, Message } from "eris";
import { OnInteractionCreate } from "./interaction";
import { OnMessageCreate } from "./message";

export const messageCreate = new EventHandler<Message>();
messageCreate.register_listener(OnMessageCreate);
export const ready = new EventHandler<undefined>();
ready.register_listener(OnReady);
export const interactionCreate = new EventHandler<Interaction>();
interactionCreate.register_listener(OnInteractionCreate);