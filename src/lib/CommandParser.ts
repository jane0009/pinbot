import {
  Argument,
  Command,
  CommandArguments,
  CommandError,
  CommandOption,
  Mention,
  WhitelistType
} from "./Command";
import { CommandInteraction, Message, TextChannel } from "eris";
import { Constants } from "eris";
import { Context } from "../context";
import { InteractionDataOptions } from "eris";
import { InteractionDataOptionWithValue } from "eris";
import { inject_context, search_modules } from "./utils";

export async function handle_interaction(ctx: Context, interaction: CommandInteraction): Promise<void | CommandError> {
  const parsed_args: CommandArguments = {
    create_reply: (reply) => {
      return interaction.createFollowup(reply);
    },
    arguments: {}
  };
  if (typeof parsed_args.arguments != "object") return;
  parsed_args.arguments.raw_interaction = interaction;
  const command_name = interaction.data.name;
  inject_context(ctx);
  const command_match = search_modules(ctx.current_modules, command_name);
  ctx.logger.debug("parser", command_name, command_match);
  if (!command_match) return;


  const check_id = command_match.command_options.whitelist == WhitelistType.GUILD ? interaction.guildID : (interaction.member?.id || interaction.user?.id || undefined);
  const perm_error = await do_permissions_check(ctx, check_id, command_match);
  ctx.logger.verbose("parser", perm_error);
  if (perm_error) return perm_error;

  const command_args = command_match.command_options.options;
  if (command_args && command_args.length > 0) {
    if (!interaction.data.options || interaction.data.options.length <= 0) return CommandError.MISSING_ARGUMENT;
    const args: {[name: string]: InteractionDataOptions} = {};
    for (const index in interaction.data.options) {
      const input = interaction.data.options[index];
      args[input.name] = input;
    }
    for (const index in command_args) {
      const arg = command_args[index];
      if (arg.required && !args[arg.name]) {
        return CommandError.MISSING_ARGUMENT;
      } else if (!args[arg.name]) continue;
      const parsed = parse_interaction_argument(arg, args[arg.name]);
      if (!parsed) return CommandError.INVALID_ARGUMENT;
      parsed_args.arguments[arg.name] = parsed;
    }
  }
  await interaction.acknowledge();
  command_match.command_function(ctx, parsed_args);
}

export async function handle_message(ctx: Context, message: Message): Promise<void | CommandError> {
  const content = message.content;
  ctx.logger.verbose("parser", message);
  if (!content.startsWith(ctx.prefix)) return;
  const parsed_args: CommandArguments = {
    create_reply: (reply) => {
      return message.channel.createMessage(reply);
    },
    arguments: {}
  };
  if (typeof parsed_args.arguments != "object") return;
  parsed_args.arguments.raw_message = message;
  if (message.referencedMessage != null) {
    parsed_args.arguments.reference = message.referencedMessage;
  }
  const split_args =
      content.substring(ctx.prefix.length)
        .split(" ");
  const command_name = split_args[0];
  inject_context(ctx);
  const command_match = search_modules(ctx.current_modules, command_name);
  ctx.logger.debug("parser", command_name, command_match);
  if (!command_match) return;

  const check_id = command_match.command_options.whitelist == WhitelistType.GUILD ? message.guildID : message.author.id;
  const perm_error = await do_permissions_check(ctx, check_id, command_match);
  ctx.logger.verbose("parser", perm_error);
  if (perm_error) return perm_error;

  const command_args = command_match.command_options.options;
  if (command_args && command_args.length > 0) {
    for (const index in command_args) {
      const arg = command_args[index];
      const str = split_args[index + 1];
      if (arg.required && !str) {
        return CommandError.MISSING_ARGUMENT;
      } else if (!str) continue;
      const parsed = parse_argument(ctx, arg, str);
      if (!parsed) {
        return CommandError.INVALID_ARGUMENT;
      }
      parsed_args.arguments[arg.name] = parsed;
    }
  }
  command_match.command_function(ctx, parsed_args);
}

// TODO: implement
function parse_interaction_argument(arg: CommandOption, input: InteractionDataOptions): Argument | undefined {
  const converted = input as unknown as InteractionDataOptionWithValue;
  return converted.value as Argument;
}

function parse_argument(ctx: Context, arg: CommandOption, str: string): Argument | undefined {
  switch (arg.type) {
  case Constants["ApplicationCommandOptionTypes"]["BOOLEAN"]: {
    if (str === "true") return true;
    if (str === "false") return false;
    return undefined;
  }
  case Constants["ApplicationCommandOptionTypes"]["INTEGER"]: {
    const parsed = parseInt(str);
    if (!parsed) return undefined;
    return parsed;
  }
  case Constants["ApplicationCommandOptionTypes"]["NUMBER"]: {
    const parsed = parseFloat(str);
    if (!parsed) return undefined;
    return parsed;
  } 
  case Constants["ApplicationCommandOptionTypes"]["SUB_COMMAND"]:
  case Constants["ApplicationCommandOptionTypes"]["SUB_COMMAND_GROUP"]:
  case Constants["ApplicationCommandOptionTypes"]["STRING"]: return str;
  case Constants["ApplicationCommandOptionTypes"]["CHANNEL"]:
  case Constants["ApplicationCommandOptionTypes"]["MENTIONABLE"]:
  case Constants["ApplicationCommandOptionTypes"]["ROLE"]:
  case Constants["ApplicationCommandOptionTypes"]["USER"]:
    return resolve_mention(ctx, str, get_type(arg.type));
  default: return undefined;
  }
}

function get_type(con: number) {
  switch (con) {
  case Constants["ApplicationCommandOptionTypes"]["CHANNEL"]: return "channel";
  case Constants["ApplicationCommandOptionTypes"]["MENTIONABLE"]: return "mentionable";
  case Constants["ApplicationCommandOptionTypes"]["ROLE"]: return "role";
  case Constants["ApplicationCommandOptionTypes"]["USER"]: return "user";
  default: return "unknown";
  }
}

async function do_permissions_check(ctx: Context, check_id: string | undefined, command_match: Command): Promise<CommandError | undefined> {
  const whitelist = command_match.command_options.whitelist;

  if (whitelist != undefined) {
    switch (whitelist) {
    case WhitelistType.OWNER: {
      if (check_id != ctx.owner) return CommandError.USER_NOT_ON_WHITELIST;
      break;
    }
    default: {
      const match = await ctx.prisma.whitelist.findFirst({
        where: {
          type: whitelist,
          whitelist_id: check_id
        }
      });
      ctx.logger.verbose("parser", command_match, whitelist, check_id, match);
      return match ? undefined : CommandError.USER_NOT_ON_WHITELIST;
    }
    }
  }
}

// TODO: implement
function resolve_mention(ctx: Context, mention: string, type: string, guild?: string): Mention[] | Mention | undefined {
  switch (type) {
  case "user": return resolve_user(ctx, mention);
  case "member": return guild ? resolve_member(ctx, guild, mention) : undefined;
  case "guild": return resolve_guild(ctx, mention);
  case "channel": return resolve_channel(ctx, guild, mention);
  default: return undefined;
  }
}

function resolve_user(ctx: Context, search: string) {
  const bot = ctx.bot;
  const users = bot.users.filter(user => user.id === search);
  if (users[0]) return users[0];

}
function resolve_member(ctx: Context, guild_id: string, search: string) { 
  const bot = ctx.bot;
  const guilds = bot.guilds.filter(guild => guild.id === guild_id);
  if (!guilds[0]) return undefined;
  const guild = guilds[0];
  const id_match = guild.members.filter(member => member.id === search);
  if (id_match[0]) return id_match[0];
}
function resolve_guild(ctx: Context, search: string) {
  const bot = ctx.bot;
  const guilds = bot.guilds.filter(guild => guild.id === search);
  if (guilds[0]) return guilds[0];
  const guilds_match = bot.guilds.filter(guild =>
    (guild.description ? guild.description.toLowerCase().includes(search.toLowerCase()) : false)
    || guild.name.toLowerCase().includes(search.toLowerCase())
  );
  if (guilds_match.length === 1) return guilds_match[0];
  if (guilds_match.length > 1) return guilds_match;
  return undefined;
}
function resolve_channel(ctx: Context, guild_id: string | undefined, search: string) {
  const bot = ctx.bot;
  let unfiltered_channels;
  if (guild_id) {
    const guilds = bot.guilds.filter(guild => guild.id === guild_id);
    if (!guilds[0]) return undefined;
    const guild = guilds[0];
    unfiltered_channels = guild.channels;
  } else {
    unfiltered_channels = bot.groupChannels;
  }
  
  const channels = unfiltered_channels.filter(channel => channel.id === search);
  if (channels[0]) return channels[0];
  const channels_match = unfiltered_channels.filter(channel =>
    ((channel as TextChannel).topic != undefined ? (channel as TextChannel).topic?.toLowerCase().includes(search.toLowerCase()) : false)
    || channel.name.toLowerCase().includes(search.toLowerCase())
  );
  if (channels_match.length === 1) return channels_match[0];
  if (channels_match.length > 1) return channels_match;
  return undefined;
}