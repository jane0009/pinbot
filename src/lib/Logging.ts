
export enum LogLevel {
  ERROR,
  WARN,
  INFO,
  DEBUG,
  VERBOSE
}

const _log_fn = console.log;

export class Logger {
  log_level: {
    [source: string]: string;
    default: string;
  };

  constructor(default_level: string) {
    this.log_level = {
      default: default_level
    };
  }

  level_from_string(level: string) {
    switch (level.toLowerCase()) {
    case "error": return LogLevel.ERROR;
    case "warn": return LogLevel.WARN;
    case "info": return LogLevel.INFO;
    case "debug": return LogLevel.DEBUG;
    case "verbose":
    default: return LogLevel.VERBOSE;
    }
  }

  _log(level: string, source: string, ...args) {
    const current_level = this.level_from_string(this.log_level[source] || this.log_level.default);
    const passed_level = this.level_from_string(level);
    if (passed_level <= current_level) {
      return _log_fn(`[${level.toUpperCase()}] (${source})`, ...args);
    }
  }

  error = (source: string, ...args) => this._log("error", source, ...args);
  warn = (source: string, ...args) => this._log("warn", source, ...args);
  info = (source: string, ...args) => this._log("info", source, ...args);
  debug = (source: string, ...args) => this._log("debug", source, ...args);
  verbose = (source: string, ...args) => this._log("verbose", source, ...args);
}