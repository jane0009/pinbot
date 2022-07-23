import { TestCommand } from "../commands/test";
import on_ready from "../events/ready";
import { on_message_create } from "../events/message";
import { on_interaction_create } from "../events/interaction";
export default {
  events: {
    botReady: [on_ready],
    messageCreate: [on_message_create],
    interactionCreate: [on_interaction_create]
  },
  commands: [
    new TestCommand()
  ]};