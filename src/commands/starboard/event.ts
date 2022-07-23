import { Member, Message, PartialEmoji } from "eris";
import { Context } from "../../context";
export function on_reaction_add(ctx: Context, message: Message, emoji: PartialEmoji, reactor: Member | {
  id: string
}) {
  ctx.logger.warn("WIP", emoji, reactor);
}

export function on_reaction_remove(ctx: Context, message: Message, emoji: PartialEmoji, user_id: string) {
  ctx.logger.warn("WIP", emoji, user_id);
}