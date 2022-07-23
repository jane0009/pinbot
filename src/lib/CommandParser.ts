import {
  Argument,
  Command,
  CommandArguments,
  CommandError,
  CommandOption,
  Mention,
  WhitelistType
} from "./Command";
import { CommandInteraction, InteractionDataOptionsSubCommand, Message, TextChannel } from "eris";
import { Constants } from "eris";
import { Context } from "../context";
import { InteractionDataOptions } from "eris";
import { InteractionDataOptionWithValue } from "eris";
import { inject_context, search_modules } from "./Registry";

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
  ctx.logger.verbose(command_name, command_match);
  if (!command_match) return;


  const user_id = interaction.member?.id || interaction.user?.id || undefined;
  if (!user_id) return CommandError.UNREACHABLE_ERROR;
  const perm_error = await do_permissions_check(ctx, user_id, interaction.guildID, command_match);
  ctx.logger.verbose(perm_error);
  if (perm_error) return perm_error;

  const command_args = command_match.command_options.options;
  const hints_to = {};
  if (command_args && command_args.length > 0) {
    if (!interaction.data.options || interaction.data.options.length <= 0) return CommandError.MISSING_ARGUMENT;
    const args: {[name: string]: InteractionDataOptions} = {};
    for (const index in interaction.data.options) {
      const input = interaction.data.options[index];
      args[input.name] = input;
    }
    const parse_errors = interaction_argument_loop(ctx, command_args, hints_to, args, interaction, parsed_args);
    if (parse_errors) return parse_errors;
  }
  await interaction.acknowledge();
  command_match.command_function(ctx, parsed_args);
}

function interaction_argument_loop(ctx: Context, command_args: CommandOption[], hints_to, args: { [name: string]: InteractionDataOptions }, interaction: CommandInteraction, parsed_args: CommandArguments): CommandError | undefined {
  if (!parsed_args.arguments) return CommandError.UNREACHABLE_ERROR;
  for (const index in command_args) {
    const arg = command_args[index];
    ctx.logger.verbose(arg, args[arg.name]);
    if (arg.type === Constants["ApplicationCommandOptionTypes"]["SUB_COMMAND"]
      || arg.type === Constants["ApplicationCommandOptionTypes"]["SUB_COMMAND_GROUP"]) {
      ctx.logger.verbose(arg, args[arg.name]);
      if (args[arg.name]) {

        if (!parsed_args.arguments["sub_command"]) {
          parsed_args.arguments["sub_command"] = [arg.name];
        } else if (Array.isArray(parsed_args.arguments["sub_command"])) {
          parsed_args.arguments["sub_command"].push(arg.name);
        } else {
          return CommandError.UNREACHABLE_ERROR;
        }
        if (arg.options) {
          const converted_arg = args[arg.name] as InteractionDataOptionsSubCommand;
          ctx.logger.verbose(args[arg.name], converted_arg);
          if (!converted_arg) return CommandError.UNREACHABLE_ERROR;
          if (converted_arg.options) {
            const new_args = {};
            for (const opt of converted_arg.options) {
              new_args[opt.name] = opt;
            }
            const parse_errors = interaction_argument_loop(ctx, arg.options, hints_to, new_args, interaction, parsed_args);
            if (parse_errors) return parse_errors;
          }
        }
      }
    }
    else {
      if (arg.required && !args[arg.name]) {
        ctx.logger.verbose(arg, args);
        return CommandError.MISSING_ARGUMENT;
      } else if (!args[arg.name]) continue;
      if (arg.hints_to) {
        if (arg.type !== Constants["ApplicationCommandOptionTypes"]["STRING"]) return CommandError.UNREACHABLE_ERROR;
        hints_to[arg.hints_to] = parse_interaction_argument(ctx, arg, args[arg.name]);
      }
      let parsed;
      if (hints_to[arg.name]) {
        parsed = parse_interaction_argument(ctx, arg, args[arg.name], hints_to[arg.name], interaction.guildID);
      }
      else {
        parsed = parse_interaction_argument(ctx, arg, args[arg.name]);
      }
      ctx.logger.verbose(args[arg.name], parsed, hints_to[arg.name]);
      if (!parsed) return CommandError.INVALID_ARGUMENT;
      parsed_args.arguments[arg.name] = parsed;
    }
  }
}

export async function handle_message(ctx: Context, message: Message): Promise<void | CommandError> {
  const content = message.content;
  ctx.logger.verbose(message);
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
  let waiting_tick = false;
  let waiting_quot = false;
  let waiting_dquot = false;
  let idx;
  // todo index stuff
  for (let index = 0; index < split_args.length; index++) {
    const str = split_args[index];
    if (waiting_tick) {
      if (str.includes("`")) {
        const joined = split_args.slice(idx, index).join(" ");
        ctx.logger.warn("split string", joined);
      }
    }
    else if (waiting_quot) {
      if (str.includes("'")) {
        const joined = split_args.slice(idx, index).join(" ");
        ctx.logger.warn("split string", joined);
      }
    }
    else if (waiting_dquot) {
      if (str.includes("\"")) {
        const joined = split_args.slice(idx, index).join(" ");
        ctx.logger.warn("split string", joined);
      }
    }
    else if (str.startsWith("\"")) {
      waiting_dquot = true;
      idx = index;
    } else if (str.startsWith("'")) {
      waiting_quot = true;
      idx = index;
    } else if (str.startsWith("`")) {
      waiting_tick = true;
      idx = index;
    }
  }
  const command_name = split_args[0];
  inject_context(ctx);
  const command_match = search_modules(ctx.current_modules, command_name);
  ctx.logger.verbose(command_name, command_match);
  if (!command_match) return;

  const user_id = message.author.id;
  const perm_error = await do_permissions_check(ctx, user_id, message.guildID, command_match);
  ctx.logger.verbose(perm_error);
  if (perm_error) return perm_error;
  
  const hints_to = {};

  const command_args = command_match.command_options.options;
  if (command_args && command_args.length > 0) {
    const parse_error = message_parse_loop(ctx, command_args, hints_to, split_args, parsed_args, 1, message.guildID);
    if (parse_error) return parse_error;
  }
  command_match.command_function(ctx, parsed_args);
}

function message_parse_loop(ctx: Context, command_args: CommandOption[], hints_to, split_args: string[], parsed_args: CommandArguments, arg_index: number, guild_id?: string): CommandError | undefined {
  if (!parsed_args.arguments) return CommandError.UNREACHABLE_ERROR;
  for (const index in command_args) {
    const arg = command_args[index];
    const str = split_args[arg_index];
    if (arg.type === Constants["ApplicationCommandOptionTypes"]["SUB_COMMAND"]
      || arg.type === Constants["ApplicationCommandOptionTypes"]["SUB_COMMAND_GROUP"]) {
      ctx.logger.verbose(arg, str, split_args);
      if (str === arg.name) {
        arg_index++;
        if (!parsed_args.arguments["sub_command"]) {
          parsed_args.arguments["sub_command"] = [str];
        } else if (Array.isArray(parsed_args.arguments["sub_command"])) {
          parsed_args.arguments["sub_command"].push(str);
        } else {
          return CommandError.UNREACHABLE_ERROR;
        }
        if (arg.options) {
          const parse_error = message_parse_loop(ctx, arg.options, hints_to, split_args, parsed_args, arg_index, guild_id);
          if (parse_error) return parse_error;
        }
      }
    } else {
      arg_index++;
      if (arg.required && !str) {
        return CommandError.MISSING_ARGUMENT;
      } else if (!str) continue;
      if (arg.hints_to) {
        if (arg.type !== Constants["ApplicationCommandOptionTypes"]["STRING"]) return CommandError.UNREACHABLE_ERROR;
        hints_to[arg.hints_to] = str;
      }
      let parsed;
      if (hints_to[arg.name]) {
        parsed = parse_argument(ctx, arg, str, guild_id, hints_to[arg.name]);
      }
      else {
        parsed = parse_argument(ctx, arg, str, guild_id);
      }
      ctx.logger.verbose(arg, str, hints_to[arg.name]);
      if (!parsed || parsed == undefined || parsed == null) {
        return CommandError.INVALID_ARGUMENT;
      }
      parsed_args.arguments[arg.name] = parsed;
    }
  }
}

// TODO: implement
function parse_interaction_argument(ctx: Context, arg: CommandOption, input: InteractionDataOptions, hint?: string, guild?: string): Argument | undefined {
  ctx.logger.verbose(arg, input, hint, guild);
  const converted = input as unknown as InteractionDataOptionWithValue;
  if (hint) {
    return resolve_mention(ctx, converted.value as string, hint, guild);
  }
  return converted.value as Argument;
}

function parse_argument(ctx: Context, arg: CommandOption, str: string, guild_id?: string, arg_override?: string): Argument | undefined {
  if (arg_override) {
    return resolve_mention(ctx, str, arg_override, guild_id);
  }
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
  case Constants["ApplicationCommandOptionTypes"]["STRING"]: return str;
  case Constants["ApplicationCommandOptionTypes"]["CHANNEL"]:
  case Constants["ApplicationCommandOptionTypes"]["MENTIONABLE"]:
  case Constants["ApplicationCommandOptionTypes"]["ROLE"]:
  case Constants["ApplicationCommandOptionTypes"]["USER"]:
    return resolve_mention(ctx, str, get_type(arg.type), guild_id);
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

async function do_permissions_check(ctx: Context, user_id: string, guild_id: string | undefined, command_match: Command): Promise<CommandError | undefined> {
  const whitelist = command_match.command_options.whitelist;

  if (whitelist != undefined) {
    if (user_id == ctx.owner) return undefined;

    const check_id = whitelist == WhitelistType.GUILD ? guild_id : user_id;
    const match = await ctx.prisma.whitelist.findFirst({
      where: {
        type: whitelist,
        whitelist_id: check_id
      }
    });
    ctx.logger.verbose(command_match, whitelist, check_id, match);
    return match ? undefined : CommandError.USER_NOT_ON_WHITELIST;
  }
}

// TODO: implement
function resolve_mention(ctx: Context, mention: string, type: string, guild?: string): Mention[] | Mention | undefined {
  switch (type) {
  case "user": return resolve_user(ctx, mention, guild);
  case "member": return guild ? resolve_member(ctx, guild, mention) : undefined;
  case "guild": return resolve_guild(ctx, mention);
  case "channel": return resolve_channel(ctx, guild, mention);
  default: return undefined;
  }
}

function resolve_user(ctx: Context, search: string, guild_id?: string) {
  const bot = ctx.bot;
  const users = bot.users.filter(user => user.id === search);
  if (users[0]) return users[0];
  const users_match = bot.users.filter(user => (user.username.toLowerCase().includes(search.toLowerCase())));
  if (users_match.length === 1) return users_match[0];
  if (users_match.length > 1) return users_match;
  if (guild_id) {
    const member_check = resolve_member(ctx, guild_id, search);
    if (member_check) return member_check;
  }
}
function resolve_member(ctx: Context, guild_id: string, search: string) { 
  const bot = ctx.bot;
  const guilds = bot.guilds.filter(guild => guild.id === guild_id);
  if (!guilds[0]) return undefined;
  const guild = guilds[0];
  const id_match = guild.members.filter(member => member.id === search);
  if (id_match[0]) return id_match[0];
  const members_match = guild.members.filter(member =>
    (member.username.toLowerCase().includes(search.toLowerCase()))
    || (!!member.nick && member.nick.toLowerCase().includes(search.toLowerCase())));
  if (members_match.length === 1) return members_match[0];
  if (members_match.length > 1) return members_match;
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
  ctx.logger.verbose(search, guilds_match);
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