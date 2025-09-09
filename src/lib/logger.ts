/**
 * 간단한 로깅 유틸리티
 * 프로덕션에서는 에러만 로깅하고, 개발 환경에서는 모든 로그를 출력합니다.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';
  private isClient = typeof window !== 'undefined';
  
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (context && Object.keys(context).length > 0) {
      return `${prefix} ${message} ${JSON.stringify(context)}`;
    }
    
    return `${prefix} ${message}`;
  }
  
  private log(level: LogLevel, message: string, context?: LogContext) {
    // 클라이언트 사이드에서는 debug 로그 제외
    if (this.isClient && level === 'debug') {
      return;
    }
    
    const formatted = this.formatMessage(level, message, context);
    
    switch (level) {
      case 'debug':
        if (this.isDevelopment) {
          console.log('\x1b[90m%s\x1b[0m', formatted); // Gray
        }
        break;
        
      case 'info':
        if (this.isDevelopment) {
          console.log('\x1b[36m%s\x1b[0m', formatted); // Cyan
        }
        break;
        
      case 'warn':
        console.warn('\x1b[33m%s\x1b[0m', formatted); // Yellow
        break;
        
      case 'error':
        console.error('\x1b[31m%s\x1b[0m', formatted); // Red
        // 프로덕션에서는 에러를 외부 서비스로 전송할 수 있음
        if (!this.isDevelopment) {
          this.sendToErrorTracking(message, context);
        }
        break;
    }
  }
  
  private sendToErrorTracking(message: string, context?: LogContext) {
    // TODO: Sentry, LogRocket 등 외부 에러 트래킹 서비스 연동
    // 예시:
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.captureMessage(message, {
    //     level: 'error',
    //     extra: context
    //   });
    // }
  }
  
  // Public methods
  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }
  
  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }
  
  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }
  
  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext: LogContext = { ...context };
    
    if (error instanceof Error) {
      errorContext.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error) {
      errorContext.error = error;
    }
    
    this.log('error', message, errorContext);
  }
  
  // API 요청/응답 로깅
  api(method: string, path: string, data?: any) {
    this.info(`API ${method} ${path}`, data);
  }
  
  // 성능 측정
  time(label: string) {
    if (this.isDevelopment) {
      console.time(label);
    }
  }
  
  timeEnd(label: string) {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }
}

// 싱글톤 인스턴스
export const logger = new Logger();

// 기존 console 메서드를 logger로 리다이렉트 (선택적)
if (process.env.NODE_ENV === 'production') {
  // 프로덕션에서 console.log 비활성화
  if (typeof window !== 'undefined') {
    window.console.log = () => {};
    window.console.debug = () => {};
  }
}

export default logger;