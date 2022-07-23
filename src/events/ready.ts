import { Context } from "../context";
const on_ready = (ctx: Context) => {
  ctx.logger.info("Ready recieved.");
};

export default on_ready;