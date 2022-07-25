import { Command, CommandDetails, CommandFunction, WhitelistType } from "../../lib/Command";
import {  Constants, CommandInteraction } from "eris";
export class StarboardCommand implements Command {
  command_options: CommandDetails = {
    name: "starboard",
    description: "starboard",
    type: Constants.ApplicationCommandTypes.CHAT_INPUT,
    whitelist: WhitelistType.GUILD,
    options: [
      {
        name: "channel",
        description: "set the starboard channel",
        type: Constants["ApplicationCommandOptionTypes"]["SUB_COMMAND"],
        options: [
          {
            name: "new_channel",
            description: "the channel to use",
            type: Constants["ApplicationCommandOptionTypes"]["CHANNEL"],
            required: true,
            channel_types: [ Constants["ChannelTypes"]["GUILD_TEXT"] ]
          }
        ]
      },
      {
        name: "emoji",
        description: "set the emoji",
        type: Constants["ApplicationCommandOptionTypes"]["SUB_COMMAND"],
        options: [
          {
            name: "new_emoji",
            description: "the emoji to use",
            type: Constants["ApplicationCommandOptionTypes"]["STRING"],
            required: true
          }
        ]
      }
    ],
    aliases: ["sb"]
  };
  command_function: CommandFunction = async (ctx, args) => {
    ctx.logger.verbose(args.arguments);
    if (!args.arguments || !args.arguments["sub_command"]) {
      await args.create_reply("missing arguments");
      return;
    }
    switch (args.arguments["sub_command"][0]) {
    case "channel": {
      const interaction = args.arguments["raw_interaction"] as CommandInteraction;
      if (!interaction.guildID || !args.arguments["new_channel"]) return;
      const result = await ctx.prisma.setting.findFirst({
        where: {
          subject_id: interaction.guildID,
          setting_name: "sb_channel"
        }
      });
      if (result) {
        await ctx.prisma.setting.updateMany({
          where: {
            subject_id: interaction.guildID,
            setting_name: "sb_channel"
          },
          data: {
            setting_value: args.arguments["new_channel"] as string
          }
        });
        await args.create_reply("updated existing channel to " + `<#${args.arguments["new_channel"]}>`);
      } else {
        await ctx.prisma.setting.create({
          data: {
            subject_id: interaction.guildID,
            setting_name: "sb_channel",
            setting_value: args.arguments["new_channel"] as string
          }
        });
        await args.create_reply("created new channel entry, set to " + `<#${args.arguments["new_channel"]}>`);
      }
      break;
    }
    case "emoji": {
      const interaction = args.arguments["raw_interaction"] as CommandInteraction;
      if (!interaction.guildID || !args.arguments["new_emoji"]) return;
      const result = await ctx.prisma.setting.findFirst({
        where: {
          subject_id: interaction.guildID,
          setting_name: "sb_emoji"
        }
      });
      if (result) {
        await ctx.prisma.setting.updateMany({
          where: {
            subject_id: interaction.guildID,
            setting_name: "sb_emoji"
          },
          data: {
            setting_value: args.arguments["new_emoji"] as string
          }
        });
        await args.create_reply("updated emoji setting to " + args.arguments["new_emoji"]);
      } else {
        await ctx.prisma.setting.create({
          data: {
            subject_id: interaction.guildID,
            setting_name: "sb_emoji",
            setting_value: args.arguments["new_emoji"] as string
          }
        });
        await args.create_reply("created new emoji entry, set to " + args.arguments["new_emoji"]);
      }
      break;
    }
    default: return;
    }
  };
}