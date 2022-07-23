import { Client } from "eris";
import { Logger } from "./lib/Logging";
import { PrismaClient } from "@prisma/client";
import { EventHandler } from "./events/EventHandler";
import { Module } from "./modules/index";

export type Context = {
  log_level: string;
  prefix: string;
  owner: string | undefined;
  bot: Client;
  logger: Logger;
  current_modules: {
    [key: string]: Module
  };
  prisma: PrismaClient;
  handlers: {
    [event: string]: EventHandler
  }
}