import { ConsoleLogger, Injectable } from '@nestjs/common';

@Injectable()
export class HealthLogger extends ConsoleLogger {
  private static logBuffer: Array<{ timestamp: string, level: string, message: string, context?: string }> = [];
  private static readonly MAX_LOGS = 20;

  private static addLog(level: string, message: string, context?: string) {
    this.logBuffer.unshift({
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    });
    if (this.logBuffer.length > this.MAX_LOGS) {
      this.logBuffer.pop();
    }
  }

  log(message: any, context?: string) {
    HealthLogger.addLog('log', String(message), context);
    super.log(message, context);
  }

  error(message: any, stackOrContext?: string) {
    HealthLogger.addLog('error', String(message), stackOrContext);
    super.error(message, stackOrContext);
  }

  warn(message: any, context?: string) {
    HealthLogger.addLog('warn', String(message), context);
    super.warn(message, context);
  }

  debug(message: any, context?: string) {
    HealthLogger.addLog('debug', String(message), context);
    super.debug(message, context);
  }

  verbose(message: any, context?: string) {
    HealthLogger.addLog('verbose', String(message), context);
    super.verbose(message, context);
  }

  static getRecentLogs() {
    return HealthLogger.logBuffer;
  }
}
