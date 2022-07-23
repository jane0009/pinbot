
export enum LogLevel {
  ERROR,
  WARN,
  INFO,
  DEBUG,
  VERBOSE
}

const _log_fn = console.log;

class StackTrace {
  level?: string;
  func?: string;
  file?: string[];
}

const runtime_log_sources: string[] = [];

export function getLogSources() {
  return runtime_log_sources;
}

function _getCallerInfo() {
  const originalFunc = Error.prepareStackTrace;

  const stack_trace: StackTrace = {};
  try {
    const err = new Error();

    const stack = err.stack?.split("\n");
    if (!stack) return stack_trace;
    stack.shift(); // Error
    stack.shift(); // at _getCallerInfo
    const log_call = stack.shift();
    const upper_call = stack.shift();
    if (!log_call || !upper_call) return stack_trace;

    const log_level_regex = /at Logger\.(error|warn|info|debug|verbose)/g;
    const file_regex = /at (.+?) \(.+\\+(.+?.js:\d+:\d+)\)/g;

    const log_level_test = log_level_regex.exec(log_call);
    if (log_level_test?.[1]) stack_trace.level = log_level_test[1];
    const file_test = file_regex.exec(upper_call);
    if (file_test?.[1]) stack_trace.func = file_test?.[1] !== "Object.<anonymous>" ? file_test?.[1] : "main";
    if (file_test?.[2]) stack_trace.file = file_test?.[2].split(":");
  } catch (e) { 
    //
  }

  Error.prepareStackTrace = originalFunc;

  return stack_trace;
}

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

  _log(source: StackTrace, ...args) {
    const level = source.level || "verbose";
    const source_func = source.func || "unknown";
    const source_file = source.file || ["Unknown file", "", ""];
    if (!runtime_log_sources.indexOf(source_file[0])) runtime_log_sources.push(source_file[0]);
    const current_level = this.level_from_string(this.log_level[source_file[0]] || this.log_level.default);
    const passed_level = this.level_from_string(level);
    if (passed_level <= current_level) {
      return _log_fn(`[${level.toUpperCase()}] (${(passed_level == LogLevel.ERROR || passed_level == LogLevel.DEBUG)
        ? `${source_func} - ${source_file[0]} at line ${source_file[1]}` 
        : source_func})`, ...args);
    }
  }

  error(...args) {
    return this._log(_getCallerInfo(), ...args);
  }
  warn(...args) {
    return this._log(_getCallerInfo(), ...args);
  }
  info(...args) {
    return this._log(_getCallerInfo(), ...args);
  }
  debug(...args) {
    return this._log(_getCallerInfo(), ...args);
  }
  verbose(...args) {
    return this._log(_getCallerInfo(), ...args);
  }
}