import { Client } from "eris";
import { Command } from "./lib/Command";
import { Logger } from "./lib/Logging";
import { PrismaClient } from "@prisma/client";

export type Context = {
  log_level: string;
  prefix: string;
  owner: string | undefined;
  bot: Client;
  logger: Logger;
  current_modules: {
    [key: string]: Command[]
  };
  prisma: PrismaClient;
}