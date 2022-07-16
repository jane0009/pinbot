import { Command, CommandDetails, CommandFunction } from "../lib/Command";
import { Constants } from "eris";
export class PingCommand implements Command {
  command_options: CommandDetails = {
    name: "ping",
    description: "ping",
    type: Constants.ApplicationCommandTypes.CHAT_INPUT,
    options: []
  };
  command_function: CommandFunction = async (_, args) => {
    const then = new Date();
    const msg = await args.create_reply("pong!");
    if (msg != undefined) {
      const now = new Date();
      const diff = now.getTime() - then.getTime();
      msg.edit(`pong! ${diff} ms`);
    }
  };
}