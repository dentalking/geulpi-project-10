'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { User, Bot, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { AIMessage } from '@/types';
import { ArtifactLink } from './ArtifactLink';
import { CalendarEvent } from '@/types';
import { useEffect, useState, Fragment } from 'react';

interface ChatMessageProps {
  message: AIMessage;
  locale: 'ko' | 'en';
  isTyping?: boolean;
  artifactEvents?: CalendarEvent[];
  artifactTitle?: string;
  isArtifactOpen?: boolean;
  onArtifactOpen?: () => void;
  onArtifactClose?: () => void;
  userPicture?: string | null;
}

function ChatMessageComponent({
  message,
  locale,
  isTyping = false,
  artifactEvents = [],
  artifactTitle = '',
  isArtifactOpen = false,
  onArtifactOpen,
  onArtifactClose,
  userPicture
}: ChatMessageProps) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Only show typewriter effect for new messages that are currently being streamed
  useEffect(() => {
    // Check if this is a new message (created within last 2 seconds)
    const isNewMessage = message.timestamp &&
      (new Date().getTime() - new Date(message.timestamp).getTime()) < 2000;

    if (message.role === 'assistant' && isNewMessage && !isTyping) {
      // Apply typewriter effect only for fresh AI messages
      setIsStreaming(true);
      let currentIndex = 0;
      const content = message.content;

      const interval = setInterval(() => {
        if (currentIndex < content.length) {
          setDisplayedContent(content.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(interval);
          setIsStreaming(false);
        }
      }, 10); // Fast typing speed

      return () => {
        clearInterval(interval);
        setDisplayedContent(content);
        setIsStreaming(false);
      };
    } else {
      // For old messages or user messages, show content immediately
      setDisplayedContent(message.content);
      setIsStreaming(false);
    }
  }, [message.content, message.role, message.timestamp, isTyping]);

  const isUser = message.role === 'user';
  const hasArtifact = message.role === 'assistant' &&
                      message.data?.action &&
                      (message.data.action.type === 'list' || message.data.action.type === 'search');

  // Debug log for user picture
  if (isUser) {
    console.log('[ChatMessage] User picture:', userPicture);
  }

  // Debug log - only for debugging, remove in production
  // console.log('[ChatMessage] Artifact check:', {
  //   messageId: message.id,
  //   role: message.role,
  //   actionType: message.data?.action?.type,
  //   artifactEventsCount: artifactEvents.length,
  //   hasArtifact,
  //   artifactEvents: artifactEvents,
  //   messageData: message.data
  // });

  const handleEventClick = (event: CalendarEvent) => {
    // Open artifact panel with the selected event instead of modal
    if (onArtifactOpen) {
      onArtifactOpen();
    }
    // Store selected event in a way that the artifact panel can access it
    // We'll need to pass this through props or context
    setSelectedEvent(event);
  };

  return (
    <Fragment>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        {/* Avatar */}
        {!isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 p-0.5 flex items-center justify-center">
              <Image
                src="/images/logo.svg"
                alt="AI Assistant"
                width={20}
                height={20}
                className="w-full h-full object-contain"
                style={{
                  filter: 'brightness(0.8) contrast(1.2)',
                  mixBlendMode: 'multiply'
                }}
              />
            </div>
          </div>
        )}

        <div className={`max-w-[70%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Message Bubble */}
        <div
          className={`
            px-4 py-2.5 rounded-2xl
            ${isUser
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            }
          `}
        >
          {isTyping ? (
            <div className="flex items-center gap-1.5">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">
                {locale === 'ko' ? '생각 중...' : 'Thinking...'}
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {displayedContent}
                {isStreaming && <span className="animate-pulse">▋</span>}
              </p>

              {/* Action Status */}
              {message.data?.action && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-xs">
                    {message.data.action.status === 'completed' && (
                      <span className="text-green-600 dark:text-green-400">
                        ✓ {locale === 'ko' ? '완료' : 'Completed'}
                      </span>
                    )}
                    {message.data.action.status === 'processing' && (
                      <span className="text-blue-600 dark:text-blue-400">
                        ⏳ {locale === 'ko' ? '처리 중' : 'Processing'}
                      </span>
                    )}
                    {message.data.action.status === 'failed' && (
                      <span className="text-red-600 dark:text-red-400">
                        ✗ {locale === 'ko' ? '실패' : 'Failed'}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Artifact Link - Only for assistant messages with events */}
        {hasArtifact && onArtifactOpen && onArtifactClose && (
          <ArtifactLink
            events={artifactEvents}
            title={artifactTitle}
            locale={locale}
            isOpen={isArtifactOpen}
            onOpen={onArtifactOpen}
            onClose={onArtifactClose}
            onEventClick={handleEventClick}
            showPreview={true}
          />
        )}

        {/* Timestamp */}
        <div className={`text-xs text-gray-500 dark:text-gray-400 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString(
            locale === 'ko' ? 'ko-KR' : 'en-US',
            { hour: '2-digit', minute: '2-digit' }
          )}
        </div>
      </div>

        {/* User Avatar */}
        {isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center overflow-hidden">
            {userPicture ? (
              <Image
                src={userPicture}
                alt="User"
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-white" />
            )}
          </div>
        )}
      </motion.div>

      {/* Removed Event Detail Modal - now using artifact panel */}
    </Fragment>
  );
}

// Memoized component for performance
export const ChatMessage = React.memo(
  ChatMessageComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.locale === nextProps.locale &&
      prevProps.isTyping === nextProps.isTyping &&
      prevProps.isArtifactOpen === nextProps.isArtifactOpen &&
      JSON.stringify(prevProps.artifactEvents) === JSON.stringify(nextProps.artifactEvents)
    );
  }
);