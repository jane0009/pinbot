import { Message } from "eris";
import { Context } from "../context";
import { get_error_text } from "../lib/Command";
import { handle_message } from "../lib/CommandParser";
export const OnMessageCreate = async (ctx: Context, message: Message) => {
  const result = await handle_message(ctx, message);
  if (result != undefined) {
    message.channel.createMessage(`recieved non-zero response: ${result} (${get_error_text(result)})`);
  }
};