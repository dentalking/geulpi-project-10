// HTML sanitization utilities to prevent XSS attacks

import React from 'react';

/**
 * Escapes HTML special characters to prevent XSS
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Safely highlights search terms in text without XSS risk
 */
export function safeHighlightText(text: string, searchTerm: string): string {
  if (!searchTerm || !text) return escapeHtml(text);
  
  // First escape the input text to prevent XSS
  const escapedText = escapeHtml(text);
  
  // Escape the search term as well for regex safety
  const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Create regex to find the search term (case insensitive)
  const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
  
  // Replace with highlighted version (safe since input is already escaped)
  return escapedText.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-900/50 px-0.5 rounded">$1</mark>');
}

/**
 * Sanitizes HTML content by removing dangerous elements and attributes
 */
export function sanitizeHtml(html: string): string {
  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Remove script tags and other dangerous elements
  const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form', 'input'];
  dangerousTags.forEach(tag => {
    const elements = tempDiv.querySelectorAll(tag);
    elements.forEach(el => el.remove());
  });
  
  // Remove dangerous attributes from all elements
  const dangerousAttrs = [
    'onload', 'onclick', 'onmouseover', 'onmouseout', 'onmousedown', 'onmouseup',
    'onkeydown', 'onkeyup', 'onkeypress', 'onfocus', 'onblur', 'onchange',
    'onsubmit', 'onreset', 'onscroll', 'onresize', 'onerror', 'onabort',
    'javascript:', 'vbscript:', 'data:', 'style'
  ];
  
  const walker = document.createTreeWalker(
    tempDiv,
    NodeFilter.SHOW_ELEMENT,
    null
  );
  
  const elements: Element[] = [];
  let node;
  while (node = walker.nextNode()) {
    elements.push(node as Element);
  }
  
  elements.forEach(element => {
    dangerousAttrs.forEach(attr => {
      if (element.hasAttribute(attr)) {
        element.removeAttribute(attr);
      }
    });
    
    // Check for javascript: or data: in href and src attributes
    ['href', 'src'].forEach(attr => {
      const value = element.getAttribute(attr);
      if (value && (value.toLowerCase().includes('javascript:') || value.toLowerCase().includes('data:'))) {
        element.removeAttribute(attr);
      }
    });
  });
  
  return tempDiv.innerHTML;
}

/**
 * Validates if a string contains potentially dangerous content
 */
export function containsDangerousContent(text: string): boolean {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<form/i,
    /data:text\/html/i
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(text));
}

/**
 * Safe text truncation that preserves HTML structure
 */
export function safeTruncateHtml(html: string, maxLength: number): string {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  const textContent = tempDiv.textContent || tempDiv.innerText || '';
  
  if (textContent.length <= maxLength) {
    return html;
  }
  
  // Truncate and add ellipsis
  const truncated = textContent.substring(0, maxLength) + '...';
  return escapeHtml(truncated);
}

/**
 * React component for safely rendering highlighted text
 */
export interface SafeHighlightProps {
  text: string;
  searchTerm: string;
  className?: string;
}

// Client-side only utility for React components
export const SafeHighlightComponent: React.FC<SafeHighlightProps> = ({ 
  text, 
  searchTerm, 
  className = '' 
}) => {
  const highlightedText = safeHighlightText(text, searchTerm);
  
  return React.createElement('span', {
    className,
    dangerouslySetInnerHTML: { __html: highlightedText }
  });
};