import { on_reaction_add, on_reaction_remove } from "../commands/starboard/event";
import { WhitelistType } from "../lib/Command";
import { Module } from "./index";
import { StarboardCommand } from "../commands/starboard/command";

//TODO eventually, messageReactionRemoveAll and messageReactionRemoveEmoji
const Starboard: Module = {
  events: {
    messageReactionAdd: [on_reaction_add],
    messageReactionRemove: [on_reaction_remove]
  },
  commands: [
    new StarboardCommand()
  ],
  settings: [
    { name: "sb_channel", default: "", type: WhitelistType.GUILD },
    { name: "sb_emoji", default: "⭐", type: WhitelistType.GUILD },
    { name: "sb_pin_threshold", default: "1", type: WhitelistType.GUILD }
  ]
};

export default Starboard;