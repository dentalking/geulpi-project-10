'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Loader2,
  HelpCircle
} from 'lucide-react';
import { useDebouncedValidation } from '@/hooks/useDebounce';
import { Tooltip } from './Tooltip';

type FieldType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea';
type ValidationStatus = 'idle' | 'validating' | 'success' | 'error' | 'warning';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
  message?: string;
}

interface FormFieldProps {
  label: string;
  name: string;
  type?: FieldType;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  helper?: string;
  tooltip?: string;
  disabled?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
  validation?: ValidationRule;
  showSuccessState?: boolean;
  showCharCount?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  helper,
  tooltip,
  disabled = false,
  readOnly = false,
  autoFocus = false,
  autoComplete,
  validation,
  showSuccessState = true,
  showCharCount = false,
  prefix,
  suffix,
  className = ''
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<ValidationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Validation function
  const validateField = (fieldValue: string): string | null => {
    if (!validation) return null;

    if (validation.required && !fieldValue.trim()) {
      return validation.message || `${label} is required`;
    }

    if (validation.minLength && fieldValue.length < validation.minLength) {
      return validation.message || `${label} must be at least ${validation.minLength} characters`;
    }

    if (validation.maxLength && fieldValue.length > validation.maxLength) {
      return validation.message || `${label} must be less than ${validation.maxLength} characters`;
    }

    if (validation.pattern && !validation.pattern.test(fieldValue)) {
      return validation.message || `${label} format is invalid`;
    }

    if (validation.custom) {
      return validation.custom(fieldValue);
    }

    return null;
  };

  // Use debounced validation
  const { error: debouncedError, isValidating } = useDebouncedValidation(
    value,
    validateField,
    300
  );

  // Update status based on validation
  useEffect(() => {
    if (!isTouched || !validation) {
      setStatus('idle');
      return;
    }

    if (isValidating) {
      setStatus('validating');
    } else if (debouncedError) {
      setStatus('error');
      setErrorMessage(debouncedError);
    } else if (value && showSuccessState) {
      setStatus('success');
      setErrorMessage(null);
    } else {
      setStatus('idle');
      setErrorMessage(null);
    }
  }, [debouncedError, isValidating, isTouched, value, validation, showSuccessState]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setIsTouched(true);
    onBlur?.();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value);
    if (!isTouched) setIsTouched(true);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'var(--color-success, #10B981)';
      case 'error':
        return 'var(--color-error, #EF4444)';
      case 'warning':
        return 'var(--color-warning, #F59700)';
      default:
        return 'var(--border-default)';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'validating':
        return <Loader2 size={16} className="animate-spin" />;
      case 'success':
        return <CheckCircle size={16} />;
      case 'error':
        return <XCircle size={16} />;
      case 'warning':
        return <AlertCircle size={16} />;
      default:
        return null;
    }
  };

  const fieldStyles = {
    container: {
      marginBottom: 'var(--space-4)'
    },
    labelContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      marginBottom: 'var(--space-2)'
    },
    label: {
      fontSize: 'var(--font-sm)',
      fontWeight: 'var(--font-medium)',
      color: 'var(--text-primary)'
    },
    inputWrapper: {
      position: 'relative' as const,
      display: 'flex',
      alignItems: 'center'
    },
    input: {
      width: '100%',
      padding: type === 'textarea' 
        ? 'var(--space-3)' 
        : `var(--space-3) ${suffix || (type === 'password') || status !== 'idle' ? '40px' : 'var(--space-3)'} var(--space-3) ${prefix ? '40px' : 'var(--space-3)'}`,
      fontSize: 'var(--font-base)',
      color: 'var(--text-primary)',
      backgroundColor: disabled ? 'var(--surface-disabled)' : 'var(--surface-primary)',
      border: `1.5px solid ${isFocused ? 'var(--color-primary)' : getStatusColor()}`,
      borderRadius: 'var(--radius-lg)',
      outline: 'none',
      transition: 'all 0.2s',
      resize: type === 'textarea' ? 'vertical' as const : 'none' as const,
      minHeight: type === 'textarea' ? '100px' : 'auto',
      opacity: disabled ? 0.6 : 1,
      cursor: disabled ? 'not-allowed' : 'text'
    },
    prefix: {
      position: 'absolute' as const,
      left: 'var(--space-3)',
      color: 'var(--text-tertiary)',
      pointerEvents: 'none' as const
    },
    suffix: {
      position: 'absolute' as const,
      right: 'var(--space-3)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)'
    },
    helper: {
      marginTop: 'var(--space-2)',
      fontSize: 'var(--font-sm)',
      color: status === 'error' ? getStatusColor() : 'var(--text-secondary)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-1)'
    },
    charCount: {
      marginTop: 'var(--space-1)',
      fontSize: 'var(--font-xs)',
      color: 'var(--text-tertiary)',
      textAlign: 'right' as const
    }
  };

  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className={`form-field ${className}`} style={fieldStyles.container}>
      {/* Label */}
      <div style={fieldStyles.labelContainer}>
        <label htmlFor={name} style={fieldStyles.label}>
          {label}
          {validation?.required && (
            <span style={{ color: 'var(--color-error)' }}>*</span>
          )}
        </label>
        {tooltip && (
          <Tooltip content={tooltip} position="top">
            <HelpCircle size={14} style={{ color: 'var(--text-tertiary)', cursor: 'help' }} />
          </Tooltip>
        )}
      </div>

      {/* Input Field */}
      <div style={fieldStyles.inputWrapper}>
        {prefix && <div style={fieldStyles.prefix}>{prefix}</div>}
        
        {type === 'textarea' ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            id={name}
            name={name}
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            autoFocus={autoFocus}
            autoComplete={autoComplete}
            style={fieldStyles.input}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            id={name}
            name={name}
            type={inputType}
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            autoFocus={autoFocus}
            autoComplete={autoComplete}
            style={fieldStyles.input}
          />
        )}

        {/* Suffix Icons */}
        <div style={fieldStyles.suffix}>
          {status !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{ color: getStatusColor() }}
            >
              {getStatusIcon()}
            </motion.div>
          )}
          
          {type === 'password' && (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              style={{
                padding: '4px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
          
          {suffix && <div>{suffix}</div>}
        </div>
      </div>

      {/* Helper Text / Error Message */}
      <AnimatePresence mode="wait">
        {(errorMessage || helper) && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            style={fieldStyles.helper}
          >
            {status === 'error' && <XCircle size={14} />}
            {errorMessage || helper}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Character Count */}
      {showCharCount && validation?.maxLength && (
        <div style={fieldStyles.charCount}>
          {value.length} / {validation.maxLength}
        </div>
      )}
    </div>
  );
};

// Preset field components for common use cases
export const EmailField: React.FC<Omit<FormFieldProps, 'type' | 'validation'>> = (props) => (
  <FormField
    {...props}
    type="email"
    validation={{
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address'
    }}
  />
);

export const PasswordField: React.FC<Omit<FormFieldProps, 'type' | 'validation'>> = (props) => (
  <FormField
    {...props}
    type="password"
    validation={{
      required: true,
      minLength: 8,
      custom: (value) => {
        if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter';
        if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter';
        if (!/[0-9]/.test(value)) return 'Password must contain at least one number';
        return null;
      }
    }}
  />
);

export const URLField: React.FC<Omit<FormFieldProps, 'type' | 'validation'>> = (props) => (
  <FormField
    {...props}
    type="url"
    validation={{
      pattern: /^https?:\/\/.+\..+/,
      message: 'Please enter a valid URL'
    }}
  />
);