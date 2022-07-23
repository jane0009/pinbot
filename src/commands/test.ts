import { Command, CommandDetails, CommandFunction, WhitelistType } from "../lib/Command";
import { Constants } from "eris";
export class TestCommand implements Command {
  // guilds?: string[] | undefined;
  command_options: CommandDetails = {
    name: "test",
    description: "Test command - subject to change",
    type: Constants["ApplicationCommandTypes"]["CHAT_INPUT"],
    options: [],
    whitelist: WhitelistType.GUILD
  };
  command_function: CommandFunction = async (ctx, args) => {
    const msg = await args.create_reply("test success");
    if (!msg) return;
    ctx.logger.debug(msg.content);
  };
}