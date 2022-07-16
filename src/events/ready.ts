import { Context } from "../context";
const OnReady = (ctx: Context) => {
  ctx.logger.info("ready", "Ready recieved.");
};

export default OnReady;