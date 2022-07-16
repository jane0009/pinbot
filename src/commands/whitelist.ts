import { Constants } from "eris";
import { Command, CommandDetails, CommandFunction, WhitelistType } from "../lib/Command";
export class WhitelistCommand implements Command {
  command_options: CommandDetails = {
    name: "whitelist",
    whitelist: WhitelistType.OWNER,
    description: "whitelist commands or modules",
    type: Constants["ApplicationCommandTypes"]["CHAT_INPUT"],
    options: [
      {
        name: "user",
        description: "Affect a user",
        type: Constants["ApplicationCommandOptionTypes"]["SUB_COMMAND_GROUP"],
        required: true,
        options: [
          {
            name: "list",
            description: "List current user whitelist",
            type: Constants["ApplicationCommandOptionTypes"]["SUB_COMMAND"],
            required: true,
            options: []
          },
          {
            name: "add",
            description: "Add user to whitelist",
            type: Constants["ApplicationCommandOptionTypes"]["SUB_COMMAND"],
            required: true,
            options: [
              {
                name: "user",
                description: "the user to add",
                type: Constants["ApplicationCommandOptionTypes"]["USER"],
                required: true,
              }
            ]
          },
          {
            name: "remove",
            description: "Remove user from whitelist",
            type: Constants["ApplicationCommandOptionTypes"]["SUB_COMMAND"],
            required: true,
            options: [
              {
                name: "user",
                description: "the user to remove",
                type: Constants["ApplicationCommandOptionTypes"]["USER"],
                required: true,
              }
            ]
          }
        ]
      },
      {
        name: "guild",
        description: "Affect a guild",
        type: Constants["ApplicationCommandOptionTypes"]["SUB_COMMAND_GROUP"],
        required: true,
        options: [
          {
            name: "list",
            description: "List current guild whitelist",
            type: Constants["ApplicationCommandOptionTypes"]["SUB_COMMAND"],
            required: true,
            options: []
          },
          {
            name: "add",
            description: "Add guild to whitelist",
            type: Constants["ApplicationCommandOptionTypes"]["SUB_COMMAND"],
            required: true,
            options: [
              {
                name: "guild",
                description: "the guild to add",
                type: Constants["ApplicationCommandOptionTypes"]["STRING"],
                required: true,
              }
            ]
          },
          {
            name: "remove",
            description: "Remove guild from whitelist",
            type: Constants["ApplicationCommandOptionTypes"]["SUB_COMMAND"],
            required: true,
            options: [
              {
                name: "guild",
                description: "the guild to remove",
                type: Constants["ApplicationCommandOptionTypes"]["STRING"],
                required: true,
              }
            ]
          }
        ]
      },
    ]
  };
  command_function: CommandFunction = (ctx, args) => {
    args.create_reply("WIP");
  };
}