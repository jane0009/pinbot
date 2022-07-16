import { ApplicationCommand, ApplicationCommandOptionsSubCommand, ApplicationCommandOptionsSubCommandGroup } from "eris";
import { ApplicationCommandOptionChoice, ApplicationCommandOptions } from "eris";
import { ApplicationCommandOptionWithChoices } from "eris";
import { Command, CommandDetails, CommandOption, WhitelistType } from "./Command";
import { Constants } from "eris";
import { get_module } from "../modules";
import { Context } from "../context";
import { Client } from "eris";

let ctx: Context;

export function inject_context(_ctx: Context) {
  ctx = _ctx;
}

export async function handle_module_registry(Bot: Client, available_modules, commands, guild_commands) {
  if (!ctx || !ctx.logger) {
    console.error("logger is not present");
    return;
  }
  const current_modules = {};
  available_modules.forEach(mod_name => {
    get_module(mod_name).then(
      async (resolved_mod) => {
        current_modules[mod_name] = resolved_mod;
        ctx.logger.verbose("registry", resolved_mod);
        for (const command of resolved_mod) {
          const options = command.command_options;
          if (options.whitelist == WhitelistType.GUILD) {
            const whitelisted_guilds = await ctx.prisma.whitelist.findMany({
              where: {
                type: 2,
                command_id: options.name
              }
            });
            command.guilds = whitelisted_guilds.map(guild => guild.whitelist_id);
          }
          if (command.guilds != undefined) {
            for (const guild_id of command.guilds) {
              ctx.logger.verbose(guild_commands[guild_id], guild_commands[guild_id]?.[options.name]);
              if (
                !guild_commands[guild_id]
                || !guild_commands[guild_id][options.name]
                || !compare_command(guild_commands[guild_id][options.name], options)
              ) {
                ctx.logger.info("registry", `recreating command ${options.name} for guild ${guild_id}`);

                if (commands[options.name]) {
                  ctx.logger.info("registry", "removing older global command");

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
                ctx.logger.verbose("registry", result);
              }
            }
          }
          else {
            if (
              !commands[options.name]
              || !compare_command(commands[options.name], options)
            ) {
              ctx.logger.info("registry", `recreating command ${options.name}`);

              for (const guild_id in guild_commands) {
                const guild = guild_commands[guild_id];
                if (guild[options.name]) {
                  ctx.logger.info("registry", `removing older guild command in ${guild_id}`);

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
                    ctx.logger.verbose("registry", opt);
                    return (opt as unknown as ApplicationCommandOptions);
                  }
                )
              });
              ctx.logger.verbose("registry", result);
            }
          }
        }
      }
    );
  });
  return current_modules;
}

export function compare_command(existing: ApplicationCommand, template: CommandDetails): boolean {
  const shallow_check = existing.name === template.name &&
    existing.description === template.description &&
    existing.type === template.type;
  return shallow_check &&
  compare_options(existing.options, template.options);
}

function compare_options(existing: ApplicationCommandOptions[] | undefined, template: CommandOption[] | undefined) {
  let diff = false;
  if ((!existing || existing.length == 0) && (!template || template.length == 0)) return true;
  if ((!existing || existing.length == 0) || (!template || template.length == 0)) return false;
  for (let i = 0; i < existing.length; i++) {

    ctx.logger.verbose("registry-CMP", i, diff);
    const ex = existing[i];
    const tp = template[i];
    ctx.logger.verbose("registry-CMP", ex, tp);
    if (!ex || !tp) { diff = true; break; }
    if (ex.description != tp.description || ex.name != tp.name || ex.type != tp.type) {
      diff = true; break;
    }
    const ext = (ex as unknown as ApplicationCommandOptionWithChoices);
    if (ext.choices || tp.choices) {
      if (ext.choices == undefined || tp.choices == undefined || !compare_choices(ext.choices, tp.choices)) {
        diff = true; break;
      }
    }
    const exo = ex.type === Constants["ApplicationCommandOptionTypes"]["SUB_COMMAND"] ? (ex as unknown as ApplicationCommandOptionsSubCommand) :
      (ex as unknown as ApplicationCommandOptionsSubCommandGroup);
    if (exo.options || tp.options) {
      if (exo.options == undefined || tp.options == undefined) {
        diff = true; break;
      }
      diff = compare_options(exo.options, tp.options);
      if (diff) break;
    }
  } 
  return diff;
}

function compare_choices(a: ApplicationCommandOptionChoice[], b: ApplicationCommandOptionChoice[]) {
  for (const i in a) {
    if (a[i] != b[i]) return false;
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
          ctx.logger.verbose("registry", opt);
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
  ctx.logger.verbose("registry-OPT", option, result);
  return result;
}

export function search_modules(modules: { [key: string]: Command[] }, name: string): Command | undefined {
  for (const key in modules) {
    const module = modules[key];
    ctx.logger.verbose("utils", key, module);
    for (const command of module) {
      ctx.logger.verbose("utils", command.command_options.name, name);
      if (command.command_options.name === name) return command;
    }
  }
  return undefined;
}