import { Command } from "../lib/Command";
import { ListenerFn } from "../events/EventHandler";
import { readdirSync } from "fs";

export class Module {
  events?: {
    [event: string]: ListenerFn[]
  };
  commands?: Command[];
  settings?: {
    [key: string]: string | number;
  };
}

export async function get_module(filename: string): Promise<Module> {
  const mod = await import(`./${filename}`);
  return mod.default;
}

export function get_module_list() {
  const dir_list = readdirSync("./src/modules");
  const modules: string[] = [];
  for (const file of dir_list) {
    if (file != "index.ts") {
      const module_name = file.replace(/\.ts|\.js/, "");
      modules.push(module_name);
    }
  }
  return modules;
}