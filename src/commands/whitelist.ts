import { Constants, ApplicationCommandOptionChoice, Guild, User } from "eris";
import { Command, CommandDetails, CommandFunction, WhitelistType, CommandArguments } from "../lib/Command";
import { Context } from "../context";
import { retroactive_create, retroactive_remove } from "../lib/Registry";
export class WhitelistCommand implements Command {
  command_options: CommandDetails = {
    name: "whitelist",
    whitelist: WhitelistType.OWNER,
    description: "whitelist commands or modules",
    type: Constants["ApplicationCommandTypes"]["CHAT_INPUT"],
    options: [
      {
        name: "list",
        description: "Display whitelist",
        type: Constants["ApplicationCommandOptionTypes"]["SUB_COMMAND"],
        required: true,
        options: [
          {
            name: "type",
            description: "Guild or User",
            required: true,
            type: Constants["ApplicationCommandOptionTypes"]["STRING"],
            choices: [
              {
                name: "Guild",
                value: "guild"
              },
              {
                "name": "User",
                "value": "user"
              }
            ]
          },
          {
            name: "command",
            description: "The command to affect",
            required: true,
            type: Constants["ApplicationCommandOptionTypes"]["STRING"]
          }
        ]
      },
      {
        name: "add",
        description: "Add to whitelist",
        type: Constants["ApplicationCommandOptionTypes"]["SUB_COMMAND"],
        required: true,
        options: [
          {
            name: "type",
            description: "Guild or User",
            required: true,
            type: Constants["ApplicationCommandOptionTypes"]["STRING"],
            hints_to: "subject",
            choices: [
              {
                name: "Guild",
                value: "guild"
              },
              {
                "name": "User",
                "value": "user"
              }
            ]
          },
          {
            name: "subject",
            description: "The guild or user to affect",
            required: true,
            type: Constants["ApplicationCommandOptionTypes"]["STRING"],
          },
          {
            name: "command",
            description: "The command to affect",
            required: true,
            type: Constants["ApplicationCommandOptionTypes"]["STRING"]
          }
        ]
      },
      {
        name: "remove",
        description: "Remove from whitelist",
        type: Constants["ApplicationCommandOptionTypes"]["SUB_COMMAND"],
        required: true,
        options: [
          {
            name: "type",
            description: "Guild or User",
            required: true,
            type: Constants["ApplicationCommandOptionTypes"]["STRING"],
            hints_to: "subject",
            choices: [
              {
                name: "Guild",
                value: "guild"
              },
              {
                "name": "User",
                "value": "user"
              }
            ]
          },
          {
            name: "subject",
            description: "The guild or user to affect",
            required: true,
            type: Constants["ApplicationCommandOptionTypes"]["STRING"],
          },
          {
            name: "command",
            description: "The command to affect",
            required: true,
            type: Constants["ApplicationCommandOptionTypes"]["STRING"]
          }
        ]
      },
    ]
  };
  command_function: CommandFunction = async (ctx, args) => {
    ctx.logger.verbose(args);
    if (!args.arguments
      || !args.arguments["type"]
      || !args.arguments["sub_command"]
      || !args.arguments["command"]) {
      args.create_reply(`Unknown error - no args
      ${!!args.arguments?.["type"]} ${!!args.arguments?.["sub_command"]} ${!!args.arguments?.["command"]} ${!!args.arguments?.["subject"]}`);
      return;
    }
    switch (args.arguments["type"]) {
    case "guild": await handle_guild(ctx, args);  break;
    case "user": await handle_user(ctx, args);  break;
    default: await args.create_reply("Unknown error - incorrect type");
    }
  };
}

async function handle_user(ctx: Context, args: CommandArguments) {
  if (!args.arguments
    || !args.arguments["type"]
    || !args.arguments["sub_command"]
    || !args.arguments["command"]) {
    args.create_reply("Unknown error - no args");
    return;
  }

  const command = args.arguments["command"] as string;
  
  if (args.arguments["sub_command"][0] === "add") {
    if (!args.arguments["subject"]) {
      await args.create_reply("No user selected");
    }
    const user = args.arguments["subject"] as User;
    const existing = await ctx.prisma.whitelist.findFirst({
      where: {
        type: WhitelistType.USER,
        whitelist_id: user.id,
        command_id: command
      }
    });
    if (existing) {
      ctx.logger.debug("attempted to add already existing whitelist entry");
      args.create_reply("Entry already exists.");
      return;
    }
    const result = await ctx.prisma.whitelist.create({
      data: {
        type: WhitelistType.USER,
        whitelist_id: user.id,
        command_id: command
      }
    });
    args.create_reply(`created entry for ${result.command_id}`);
  }
  else if (args.arguments["sub_command"][0] === "remove") {
    if (!args.arguments["subject"]) {
      await args.create_reply("No user selected");
    }
    const user = args.arguments["subject"] as User;
    const existing = await ctx.prisma.whitelist.findFirst({
      where: {
        type: WhitelistType.USER,
        whitelist_id: user.id,
        command_id: command
      }
    });
    if (!existing) {
      ctx.logger.debug("attempted to remove non-existant whitelist entry");
      args.create_reply("Entry does not exist.");
      return;
    }
    const result = await ctx.prisma.whitelist.deleteMany(
      {
        where: {
          type: WhitelistType.USER,
          whitelist_id: user.id,
          command_id: command
        }
      }
    );
    args.create_reply(`deleted ${result.count} entry/entries`);
  }
  else if (args.arguments["sub_command"][0] === "list") {
    const list = await ctx.prisma.whitelist.findMany({
      where: {
        type: WhitelistType.USER,
        command_id: command
      }
    });
    if (list.length === 0) {
      args.create_reply("```\nNo entries.\n```");
      return;
    }
    let str = "";
    for (const entry of list) {
      const guild_match = ctx.bot.users.filter(
        guild => guild.id === entry.whitelist_id
      );
      if (guild_match[0]) {
        str += `${guild_match[0].username}\n`;
      }
    }
    args.create_reply("```\n" + str + "\n```");
  }
}

async function handle_guild(ctx: Context, args: CommandArguments) {
  if (!args.arguments
    || !args.arguments["type"]
    || !args.arguments["sub_command"]
    || !args.arguments["command"]) {
    args.create_reply("Unknown error - no args");
    return;
  }

  const command = args.arguments["command"] as string;

  if (args.arguments["sub_command"][0] === "add") {
    if (!args.arguments["subject"]) {
      await args.create_reply("No guild selected");
    }
    const guild = args.arguments["subject"] as Guild;
    const existing = await ctx.prisma.whitelist.findFirst({
      where: {
        type: WhitelistType.GUILD,
        whitelist_id: guild.id,
        command_id: command
      }
    });
    if (existing) {
      ctx.logger.debug("attempted to add already existing whitelist entry");
      args.create_reply("Entry already exists.");
      return;
    }
    const result = await ctx.prisma.whitelist.create({
      data: {
        type: WhitelistType.GUILD,
        whitelist_id: guild.id,
        command_id: command
      }
    });
    args.create_reply(`created entry for ${result.command_id}`);
    retroactive_create(guild.id, command);
  }
  else if (args.arguments["sub_command"][0] === "remove") {
    if (!args.arguments["subject"]) {
      await args.create_reply("No guild selected");
    }
    const guild = args.arguments["subject"] as Guild;
    const existing = await ctx.prisma.whitelist.findFirst({
      where: {
        type: WhitelistType.GUILD,
        whitelist_id: guild.id,
        command_id: command
      }
    });
    if (!existing) {
      ctx.logger.debug("attempted to remove non-existant whitelist entry");
      args.create_reply("Entry does not exist.");
      return;
    }
    const result = await ctx.prisma.whitelist.deleteMany(
      {
        where: {
          type: WhitelistType.GUILD,
          whitelist_id: guild.id,
          command_id: command
        }
      }
    );
    args.create_reply(`deleted ${result.count} entry/entries`);
    retroactive_remove(guild.id, command);
  }
  else if (args.arguments["sub_command"][0] === "list") {
    const list = await ctx.prisma.whitelist.findMany({
      where: {
        type: WhitelistType.GUILD,
        command_id: command
      }
    });
    if (list.length === 0) {
      args.create_reply("```\nNo entries.\n```");
      return;
    }
    let str = "";
    for (const entry of list) {
      const guild_match = ctx.bot.guilds.filter(
        guild => guild.id === entry.whitelist_id
      );
      if (guild_match[0]) {
        str += `${guild_match[0].name}\n`;
      }
    }
    args.create_reply("```\n" + str + "\n```");
  }
}