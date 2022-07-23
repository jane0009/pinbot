import { Command, CommandDetails, CommandFunction, WhitelistType } from "../lib/Command";
import { Constants } from "eris";
export class EvalCommand implements Command {
  command_options: CommandDetails = {
    name: "eval",
    description: "eval",
    type: Constants.ApplicationCommandTypes.CHAT_INPUT,
    options: [
      {
        name: "text",
        type: Constants["ApplicationCommandOptionTypes"]["STRING"],
        required: true,
        description: "text",
      }
    ],
    whitelist: WhitelistType.OWNER
  };
  command_function: CommandFunction = async (ctx, args) => {
    if (!args.arguments || !args.arguments["text"] || typeof args.arguments["text"] != "string") return;
    ctx.logger.warn("evaluating raw string", args.arguments["text"]);
    const result = eval(args.arguments["text"]);
    if (result) {
      await args.create_reply("```\n" + result + "\n```");
    }
  };
}