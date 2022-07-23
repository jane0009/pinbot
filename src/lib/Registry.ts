import { ApplicationCommand, ApplicationCommandOptionsSubCommand, ApplicationCommandOptionsSubCommandGroup } from "eris";
import { ApplicationCommandOptionChoice, ApplicationCommandOptions } from "eris";
import { ApplicationCommandOptionWithChoices } from "eris";
import { Command, CommandDetails, CommandOption, WhitelistType } from "./Command";
import { Constants } from "eris";
import { get_module } from "../modules";
import { Context } from "../context";
import { Client } from "eris";
import { Module } from "../modules/index";
import { EventHandler } from "../events/EventHandler";

let ctx: Context;

export function inject_context(_ctx: Context) {
  ctx = _ctx;
}

function find_command(command: string) {
  let match: Command | undefined = undefined;
  for (const key in ctx.current_modules) {
    const module = ctx.current_modules[key];
    if (!module.commands) return undefined;
    const cmd_match = module.commands.filter(
      cmd => cmd.command_options.name === command
    );
    if (cmd_match[0]) match = cmd_match[0];
  }
  return match;
}

export async function retroactive_create(gid: string, command: string) {
  const guilds = ctx.bot.guilds.filter(guild => guild.id === gid);
  if (!guilds[0]) return;
  const guild = guilds[0];
  const commands = await guild.getCommands();
  const command_match = commands.filter(
    cmd => cmd.name === command
  );
  if (command_match[0]) return;

  const cmd_obj = find_command(command);
  const options = cmd_obj?.command_options;
  if (!options) return;
  await ctx.bot.createGuildCommand(gid, {
    name: options.name,
    description: options.description,
    type: options.type,
    options: options.options?.map(
      option => (get_option(option) as unknown as ApplicationCommandOptions)
    )
  });
}

export async function retroactive_remove(gid: string, command: string) {
  const guilds = ctx.bot.guilds.filter(guild => guild.id === gid);
  if (!guilds[0]) return;
  const guild = guilds[0];
  const commands = await guild.getCommands();
  const cmd_match = commands.filter(
    cmd => cmd.name === command
  );
  if (!cmd_match[0]) return;
  await ctx.bot.deleteGuildCommand(gid, cmd_match[0].id);
}

export async function handle_module_registry(Bot: Client, available_modules, commands, guild_commands) {
  if (!ctx || !ctx.logger) {
    console.error("logger is not present");
    return;
  }
  const current_modules: {
    [key: string]: Module
  } = {};
  for (const mod_name of available_modules) {
    const resolved_mod = await get_module(mod_name);
    if (!resolved_mod) {
      ctx.logger.error("get_module null return for", mod_name);
      break;
    }
    if (resolved_mod.events) {
      const events = resolved_mod.events;
      for (const event in events) {
        ctx.logger.info(`registering ${event} handler`);
        const listeners = events[event];
        if (!ctx.handlers[event]) {
          ctx.handlers[event] = new EventHandler();
          Bot.on(event, (...args) => {
            ctx.logger.verbose(event, ctx.handlers[event]);
            ctx.handlers[event].handle_event(ctx, ...args);
          });
          ctx.logger.verbose(event, ctx.handlers[event]);
        }
        ctx.logger.verbose(listeners);
        for (const listener of listeners) {
          ctx.logger.verbose(listener);
          ctx.handlers[event].register_listener(listener);
        }
      }
    }
    ctx.logger.verbose(ctx.handlers);
    if (resolved_mod.commands) {
      current_modules[mod_name] = resolved_mod;
      ctx.logger.verbose(resolved_mod);
      for (const command of resolved_mod.commands) {
        ctx.logger.verbose(command);
        const options = command.command_options;
        if (options.whitelist == WhitelistType.GUILD) {
          const whitelisted_guilds = await ctx.prisma.whitelist.findMany({
            where: {
              type: 2,
              command_id: options.name
            }
          });
          command.guilds = whitelisted_guilds.map(guild => guild.whitelist_id);
          ctx.logger.verbose(options.name, command.guilds);
        }
        if (command.guilds != undefined) {
          for (const guild_id of command.guilds) {
            ctx.logger.verbose(guild_commands[guild_id], guild_commands[guild_id]?.[options.name]);
            if (
              !guild_commands[guild_id]
                || !guild_commands[guild_id][options.name]
                || !compare_command(guild_commands[guild_id][options.name], options)
            ) {
              ctx.logger.info(`recreating command ${options.name} for guild ${guild_id}`);

              if (commands[options.name]) {
                ctx.logger.info("removing older global command");

                Bot.deleteCommand(commands[options.name].id);
              }
              const result = await Bot.createGuildCommand(guild_id, {
                name: options.name,
                description: options.description,
                type: options.type,
                options: options.options?.map(
                  option => (get_option(option) as unknown as ApplicationCommandOptions)
                )
              });
              ctx.logger.verbose(result);
            }
          }
          const needs_delete = Object.keys(guild_commands).filter(guild_id => guild_commands[guild_id][options.name] != undefined && !command.guilds?.includes(guild_id));
          if (needs_delete.length > 0) {
            for (const guild_id of needs_delete) {
              ctx.logger.info(`deleting command ${options.name} from un-whitelisted guild ${guild_id}`);
              Bot.deleteGuildCommand(guild_id, guild_commands[guild_id][options.name].id);
            }
          }
        }
        else {
          if (
            !commands[options.name]
              || !compare_command(commands[options.name], options)
          ) {
            ctx.logger.info(`recreating command ${options.name}`);

            for (const guild_id in guild_commands) {
              const guild = guild_commands[guild_id];
              if (guild[options.name]) {
                ctx.logger.info(`removing older guild command in ${guild_id}`);

                Bot.deleteGuildCommand(guild_id, guild[options.name].id);
              }
            }
            const result = await Bot.createCommand({
              name: options.name,
              description: options.description,
              type: options.type,
              options: options.options?.map(
                option => {
                  const opt = get_option(option);
                  ctx.logger.verbose(opt);
                  return (opt as unknown as ApplicationCommandOptions);
                }
              )
            });
            ctx.logger.verbose(result);
          }
        }
      }
    }
  }
  ctx.logger.verbose(ctx.handlers);
  Bot.emit("botReady");
  return current_modules;
}

export function compare_command(existing: ApplicationCommand, template: CommandDetails): boolean {
  const shallow_check = existing.name === template.name &&
    existing.description === template.description &&
    existing.type === template.type;
  ctx.logger.verbose(existing.name, shallow_check);
  return shallow_check &&
  compare_options(existing.options, template.options);
}

function compare_options(existing: ApplicationCommandOptions[] | undefined, template: CommandOption[] | undefined) {
  let diff = false;
  if ((!existing || existing.length == 0) && (!template || template.length == 0)) return true;
  if ((!existing || existing.length == 0) || (!template || template.length == 0)) return false;
  if (existing.length != template.length) return false;
  ctx.logger.verbose("s", existing, template);
  for (let i = 0; i < existing.length; i++) {

    ctx.logger.verbose(i, diff);
    const ex = existing[i];
    const tp = template[i];
    ctx.logger.verbose(ex, tp);
    if (!ex || !tp) { diff = true; break; }
    if (ex.description != tp.description || ex.name != tp.name || ex.type != tp.type) {
      ctx.logger.verbose("diff");
      diff = true; break;
    }
    const ext = (ex as unknown as ApplicationCommandOptionWithChoices);
    if (ext.choices || tp.choices) {
      if (ext.choices == undefined || tp.choices == undefined || !compare_choices(ext.choices, tp.choices)) {
        ctx.logger.verbose("diff");
        diff = true; break;
      }
    }
    const exo = ex.type === Constants["ApplicationCommandOptionTypes"]["SUB_COMMAND"] ? (ex as unknown as ApplicationCommandOptionsSubCommand) :
      (ex as unknown as ApplicationCommandOptionsSubCommandGroup);
    if (exo.options || tp.options) {
      if (exo.options == undefined || tp.options == undefined) {
        ctx.logger.verbose("diff");
        diff = true; break;
      }
      ctx.logger.verbose(exo.options, tp.options);
      diff = !compare_options(exo.options, tp.options);
      ctx.logger.verbose(tp.name, diff);
      if (diff) break;
    }
    ctx.logger.verbose(ex, tp, diff);
  } 
  return !diff;
}

function compare_choices(a: ApplicationCommandOptionChoice[], b: ApplicationCommandOptionChoice[]) {
  ctx.logger.verbose(a, b);
  for (const i in a) {
    ctx.logger.verbose(a[i], b[i], a[i] != b[i]);
    if (a[i].name != b[i].name || a[i].value != b[i].value) return false;
  }
  return true;
}

export function get_option(option: CommandOption) {
  let result = {};
  switch (option.type) {
  case Constants["ApplicationCommandOptionTypes"]["SUB_COMMAND"]:
  case Constants["ApplicationCommandOptionTypes"]["SUB_COMMAND_GROUP"]:
  {
    result = {
      description: option.description,
      name: option.name,
      type: option.type,
      options: option.options?.map(
        option => {
          const opt = get_option(option);
          ctx.logger.verbose(opt);
          return (opt as unknown as ApplicationCommandOptions);
        }
      )
    };
    break;
  }
  case Constants["ApplicationCommandOptionTypes"]["STRING"]:
  case Constants["ApplicationCommandOptionTypes"]["INTEGER"]:
  case Constants["ApplicationCommandOptionTypes"]["NUMBER"]:
  {
    result = {
      description: option.description,
      name: option.name,
      type: option.type,
      required: option.required,
      choices: option.choices
    };
    break;
  }
  default: {
    result = {
      description: option.description,
      name: option.name,
      type: option.type
    };}
  }
  ctx.logger.verbose(option, result);
  return result;
}

export function search_modules(modules: { [key: string]: Module }, name: string): Command | undefined {
  for (const key in modules) {
    const module = modules[key];
    ctx.logger.verbose(key, module);
    if (!module.commands) return undefined;
    for (const command of module.commands) {
      ctx.logger.verbose(command.command_options.name, name);
      if (command.command_options.name === name) return command;
    }
  }
  return undefined;
}