declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TOKEN: string;
      LOG_LEVEL: string;
      PREFIX: string;
      OWNER?: string;
    }
  }
}

export { };