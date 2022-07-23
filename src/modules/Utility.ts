import { PingCommand } from "../commands/ping";
import { WhitelistCommand } from "../commands/whitelist";
export default {
  commands: [
    new PingCommand(), new WhitelistCommand()] };