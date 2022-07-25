import { Embed, Member, Message, PartialEmoji, TextChannel } from "eris";
import { Context } from "../../context";
import { get_setting_value } from "../../lib/Registry";
export async function on_reaction_add(ctx: Context, message: Message, emoji: PartialEmoji, reactor: Member | {
  id: string
}) {
  // note: ALWAYS update embed with latest message content upon starring
  ctx.logger.verbose("WIP", emoji, reactor);
  const channel = await get_setting_value("sb_channel", reactor?.id, message.guildID);
  if (channel == "") return;
  const emoji_set = await get_setting_value("sb_emoji", reactor?.id, message.guildID);
  ctx.logger.verbose(channel, emoji_set);
  
  const emoji_reg = /<a?:(.+?):(\d+)>/g;

  if (!emoji.id) {
    if (emoji.name == emoji_set) {
      await add_star(ctx, message, reactor);
    }
  } else {
    const parsed = emoji_reg.exec(emoji_set as string);
    if (!parsed || !parsed[1] || !parsed[2]) {
      return;
    }
    if (parsed[1] == emoji.name && parsed[2] == emoji.id) {
      await add_star(ctx, message, reactor);
    }
  }

  await do_threshold_check(ctx, message);
}

async function add_star(ctx: Context, message: Message, reactor: Member | {
  id: string
}) {
  const result = await ctx.prisma.starboardReaction.findFirst({
    where: {
      user_id: reactor.id,
      message_id: message.id
    }
  });
  if (result) return;
  await ctx.prisma.starboardReaction.create({
    data: {
      message_id: message.id,
      user_id: reactor.id
    }
  });
}

async function remove_star(ctx: Context, message: Message, reactor_id) {
  const result = await ctx.prisma.starboardReaction.findFirst({
    where: {
      user_id: reactor_id,
      message_id: message.id
    }
  });
  if (!result) return;
  await ctx.prisma.starboardReaction.deleteMany({
    where: {
      user_id: reactor_id,
      message_id: message.id
    }
  });

  await do_threshold_check(ctx, message);
}

export async function on_reaction_remove(ctx: Context, message: Message, emoji: PartialEmoji, user_id: string) {
  ctx.logger.warn("WIP", emoji, user_id);
  const channel = await get_setting_value("sb_channel", message.author?.id, message.guildID);
  if (channel == "") return;
  const emoji_set = await get_setting_value("sb_emoji", message.author?.id, message.guildID);

  const emoji_reg = /<a?:(.+?):(\d+)>/g;

  if (!emoji.id) {
    if (emoji.name == emoji_set) {
      await remove_star(ctx, message, user_id);
    }
  } else {
    const parsed = emoji_reg.exec(emoji_set as string);
    if (!parsed || !parsed[1] || !parsed[2]) {
      return;
    }
    if (parsed[1] == emoji.name && parsed[2] == emoji.id) {
      await remove_star(ctx, message, user_id);
    }
  }
}

async function do_threshold_check(ctx: Context, message: Message) {
  if (!message.guildID) return;
  const count = await ctx.prisma.starboardReaction.count({
    where: {
      message_id: message.id
    }
  });
  const threshold_set = await get_setting_value("sb_pin_threshold", message.author?.id, message.guildID);
  let threshold = parseInt(threshold_set as string);
  if (!threshold) threshold = 1;

  const existing_message = await ctx.prisma.starboardMessage.findFirst({
    where: {
      message_id: message.id
    }
  });
  if (count >= threshold) {
    if (existing_message) {
      await update_message(ctx, message, existing_message.embed_id, count);
    } else {
      await create_message(ctx, message, count);
    }
  } else {
    if (existing_message) {
      await delete_message(ctx, message.guildID, existing_message.embed_id);
    }
  }
}

async function get_embed_object(ctx: Context, message: Message, count: number): Promise<Embed> {
  ctx.logger.verbose(message.channel.id, message.id);

  const full_message = await ctx.bot.getMessage(message.channel.id, message.id);
  if (!full_message) return {
    type: "rich",
    description: "error getting message author"
  };
  const matching_embed_urls = full_message.embeds ? full_message.embeds.filter(
    embed => embed.type === "image" || embed.type === "gifv" || embed.type === "video"
  ) : [];
  ctx.logger.debug(full_message);
  return {
    type: "rich",
    author: {
      name: `${full_message.author.username}#${full_message.author.discriminator}`,
      icon_url: full_message.author.avatarURL
    },
    title: "Jump link",
    description: full_message.content,
    url: `https://discord.com/channels/${full_message.guildID}/${full_message.channel.id}/${full_message.id}`,
    image: (full_message.attachments && full_message.attachments.length > 0) ? { url: full_message.attachments[0].url } : (matching_embed_urls.length > 0 ? matching_embed_urls[0] : undefined),
    timestamp: new Date(full_message.timestamp),
    fields: [
      {
        name: "\u200b",
        value: `${count} votes`
      }
    ]
  };
}

async function update_message(ctx: Context, message: Message, embed_id: string, count: number) {
  const channel_set = await get_setting_value("sb_channel", undefined, message.guildID);
  if (channel_set == "") return;
  const guild_id = ctx.bot.channelGuildMap[channel_set as string];
  if (!guild_id) return;
  const around = await ctx.bot.getMessages(channel_set as string, {
    around: embed_id,
    limit: 1
  });
  if (!around.length || around[0].id != embed_id) {
    ctx.logger.warn("invalid embed message, deleting");
    await ctx.prisma.starboardMessage.delete({
      where: {
        embed_id: embed_id,
      }
    });
    return;
  }
  const embed = await ctx.bot.getMessage(channel_set as string, embed_id);
  if (!embed) {
    message.channel.createMessage("error! could not find existing embed but it should exist.");
    return;
  }
  await embed.edit({
    embed: await get_embed_object(ctx, message, count)
  });
}

async function create_message(ctx: Context, message: Message, count: number) {
  const channel_set = await get_setting_value("sb_channel", undefined, message.guildID);
  if (channel_set == "") return;
  const guild_id = ctx.bot.channelGuildMap[channel_set as string];
  if (!guild_id) return;
  const guilds = ctx.bot.guilds.filter(guild => guild.id === guild_id);
  if (!guilds[0]) return;
  const channels = guilds[0].channels.filter(
    channel => channel.id === channel_set
  );
  if (!channels[0]) return;
  const channel = channels[0] as TextChannel;
  if (channel.createMessage == undefined) return;
  const created_message = await channel.createMessage({
    embed: await get_embed_object(ctx, message, count)
  });
  await ctx.prisma.starboardMessage.create({
    data: {
      embed_id: created_message.id,
      message_id: message.id
    }
  });
}

async function delete_message(ctx: Context, guild_id: string, embed_id: string) {
  const channel_set = await get_setting_value("sb_channel", undefined, guild_id);
  if (channel_set == "") return;
  const around = await ctx.bot.getMessages(channel_set as string, {
    around: embed_id,
    limit: 1
  });
  if (!around.length || around[0].id != embed_id) {
    ctx.logger.warn("invalid embed message, deleting");
    await ctx.prisma.starboardMessage.delete({
      where: {
        embed_id: embed_id,
      }
    });
    return;
  }
  const embed = await ctx.bot.getMessage(channel_set as string, embed_id);
  if (!embed) return;
  await embed.delete();
  await ctx.prisma.starboardMessage.delete({
    where: {
      embed_id: embed_id,
    }
  });
}