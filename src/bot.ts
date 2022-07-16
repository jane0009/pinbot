import * as events from "./events";
import Eris from "eris";
import { Context } from "./context";
import { EventHandler } from "./events/EventHandler";
import { get_module_list } from "./modules/index";
import { handle_module_registry, inject_context } from "./lib/utils";
import { Logger } from "./lib/Logging";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const available_modules = get_module_list();

if (!process.env.TOKEN) process.exit();
if (!process.env.LOG_LEVEL) process.env.LOG_LEVEL = "DEBUG";
if (!process.env.PREFIX) process.exit();
const Bot = new Eris.Client(process.env.TOKEN);

const context: Context = {
  log_level: process.env.LOG_LEVEL,
  prefix: process.env.PREFIX,
  owner: process.env.OWNER,
  bot: Bot,
  current_modules: {},
  logger: new Logger(process.env.LOG_LEVEL),
  prisma: new PrismaClient(),
};

Bot.on("ready", async () => {
  const commands = {};
  const guild_commands = {};
  const curCommands = await Bot.getCommands();
  curCommands.forEach(command => commands[command.name] = command);
  for (const [_, guild] of Bot.guilds) {
    const curCommands = await guild.getCommands();
    if (!guild_commands[guild.id]) guild_commands[guild.id] = {};
    curCommands.forEach(command => guild_commands[guild.id][command.name] = command);
  }
  inject_context(context);
  const result = await handle_module_registry(Bot, available_modules, commands, guild_commands);
  if (!result) {process.exit(1);}
  context.current_modules = result;
});

for (const event in events) {
  context.logger.info("main", `registering ${event} handler`);
  const handler = events[event];
  if (!(handler instanceof EventHandler)) {
    context.logger.warn("main", "could not register event as it is not an event handler");
    continue;
  }
  Bot.on(event, (...args) => {
    context.logger.verbose("main", event, events[event]);
    events[event].handle_event(context, ...args);
  });
}

Bot.on("error", (err) => context.logger.error("main", err));

Bot.connect();

//TODO: (list)
// command settings (user, guild)
// - feedback command
// - reload command