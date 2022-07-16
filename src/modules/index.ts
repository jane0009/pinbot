import { Command } from "../lib/Command";

export async function get_module<T extends Command>(filename: string): Promise<T[]> {
  const mod = await import(`./${filename}`);
  return mod.default;
}

export function get_module_list() {
  return [
    "BasicModule",
    "PermModule"
  ];
}