import { Interaction, CommandInteraction } from "eris";
import { Context } from "../context";
import { get_error_text } from "../lib/Command";
import { handle_interaction } from "../lib/CommandParser";
export const OnInteractionCreate = async (ctx: Context, interaction: Interaction) => {
  if (interaction instanceof CommandInteraction) {
    const result = await handle_interaction(ctx, interaction);
    if (result != undefined) {
      await interaction.acknowledge();
      await interaction.createFollowup(`received non-zero response: ${result} (${get_error_text(result) })`);
    }
  } else {
    ctx.logger.debug("event", interaction);
  }
};