import { on_reaction_add, on_reaction_remove } from "../commands/starboard/event";
export default {
  events: {
    messageReactionAdd: [on_reaction_add],
    messageReactionRemove: [on_reaction_remove]
  },
  commands: [

  ]
};