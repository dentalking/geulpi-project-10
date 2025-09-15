// Enhanced error handling utilities for both client and server

import { NextResponse } from 'next/server';
import { logError } from '@/lib/api-errors';
import React from 'react';

// Error context interface
export interface ErrorContext {
  userId?: string;
  action?: string;
  endpoint?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

// Enhanced API error response interface
export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  message?: string;
  timestamp: string;
  requestId?: string;
  details?: Record<string, any>;
  userMessage?: string; // User-friendly message
}

// Error severity levels
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// Enhanced error logger with structured logging
export class EnhancedErrorLogger {
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static logApiError(
    error: unknown,
    context: ErrorContext,
    severity: ErrorSeverity = 'medium'
  ): string {
    const requestId = this.generateRequestId();
    
    const enhancedContext = {
      ...context,
      requestId,
      severity,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      userAgent: context.userAgent || 'unknown'
    };

    // Use existing logError with enhanced context
    logError(error, enhancedContext);

    // In production, also send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to Sentry, DataDog, etc.
      console.error('[PRODUCTION_ERROR]', {
        ...enhancedContext,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      });
    }

    return requestId;
  }

  static createApiErrorResponse(
    error: unknown,
    context: ErrorContext,
    userMessage?: string
  ): NextResponse<ApiErrorResponse> {
    const requestId = this.logApiError(error, context);
    
    // Determine user-friendly message
    let finalUserMessage = userMessage;
    if (!finalUserMessage) {
      if (error instanceof Error) {
        // Map common error messages to user-friendly ones
        if (error.message.includes('auth') || error.message.includes('token')) {
          finalUserMessage = '인증에 문제가 발생했습니다. 다시 로그인해주세요.';
        } else if (error.message.includes('permission') || error.message.includes('access')) {
          finalUserMessage = '권한이 없습니다. 관리자에게 문의하세요.';
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          finalUserMessage = '네트워크 오류입니다. 연결을 확인하고 다시 시도해주세요.';
        } else if (error.message.includes('validation') || error.message.includes('invalid')) {
          finalUserMessage = '입력된 정보가 올바르지 않습니다. 다시 확인해주세요.';
        } else {
          finalUserMessage = '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        }
      }
    }

    const response: ApiErrorResponse = {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      code: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString(),
      requestId,
      userMessage: finalUserMessage
    };

    // Add details in development
    if (process.env.NODE_ENV === 'development') {
      response.details = {
        stack: error instanceof Error ? error.stack : undefined,
        context
      };
    }

    return NextResponse.json(response, { 
      status: this.getStatusCode(error),
      headers: {
        'X-Request-ID': requestId,
        'X-Error-Code': response.code || 'UNKNOWN_ERROR'
      }
    });
  }

  private static getStatusCode(error: unknown): number {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      return (error as any).statusCode;
    }
    if (error instanceof Error) {
      if (error.message.includes('auth') || error.message.includes('token')) return 401;
      if (error.message.includes('permission') || error.message.includes('access')) return 403;
      if (error.message.includes('not found')) return 404;
      if (error.message.includes('validation') || error.message.includes('invalid')) return 400;
    }
    return 500;
  }
}

// Client-side error handling utilities
export class ClientErrorHandler {
  private static toastManager: any = null;

  static setToastManager(manager: any) {
    this.toastManager = manager;
  }

  static handleApiError(error: any, context?: { action?: string; showToast?: boolean }) {
    const showToast = context?.showToast !== false;
    const action = context?.action || '작업';

    if (!error) return;

    // Extract error information
    let title = '오류 발생';
    let message = '일시적인 오류가 발생했습니다.';
    
    if (error.response?.data) {
      const errorData = error.response.data;
      title = errorData.userMessage || errorData.error || title;
      message = errorData.message || message;
    } else if (error.message) {
      title = error.message;
    }

    // Show toast notification if available
    if (showToast && this.toastManager) {
      this.toastManager.error(title, {
        message,
        persistent: error.response?.status >= 500, // Persist server errors
        action: error.response?.status >= 500 ? {
          label: '다시 시도',
          onClick: () => window.location.reload()
        } : undefined
      });
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[Client Error]', {
        context,
        error,
        timestamp: new Date().toISOString()
      });
    }

    return { title, message };
  }

  static handleNetworkError(error: any) {
    return this.handleApiError({
      message: '네트워크 연결을 확인해주세요',
      response: { status: 0 }
    }, { action: '네트워크 연결' });
  }

  static wrapAsyncAction<T>(
    asyncFn: () => Promise<T>,
    context?: { action?: string; successMessage?: string }
  ): Promise<T | null> {
    return asyncFn()
      .then(result => {
        if (context?.successMessage && this.toastManager) {
          this.toastManager.success(context.successMessage);
        }
        return result;
      })
      .catch(error => {
        this.handleApiError(error, context);
        return null;
      });
  }
}

// HOC for error boundary
export const withErrorBoundary = (Component: React.ComponentType<any>) => {
  return class extends React.Component {
    constructor(props: any) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      // Log the error
      console.error('[Error Boundary]', error, errorInfo);
      
      // In production, send to monitoring service
      if (process.env.NODE_ENV === 'production') {
        // TODO: Send to error tracking service
      }
    }

    render() {
      if ((this.state as any).hasError) {
        return (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            backgroundColor: '#fef2f2'
          }}>
            <h2 style={{ color: '#dc2626', marginBottom: '1rem' }}>
              문제가 발생했습니다
            </h2>
            <p style={{ color: '#666', marginBottom: '1rem' }}>
              페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              새로고침
            </button>
          </div>
        );
      }

      return <Component {...this.props} />;
    }
  };
};