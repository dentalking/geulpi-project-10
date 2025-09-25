'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Image as ImageIcon,
  Paperclip,
  Mic,
  StopCircle,
  X,
  Plus
} from 'lucide-react';
import { AIMessage } from '@/types';
import { CalendarEvent } from '@/types';
import { ChatMessage } from './ChatMessage';
import { useToastContext } from '@/providers/ToastProvider';

interface ChatInterfaceProps {
  messages: AIMessage[];
  locale: 'ko' | 'en';
  isProcessing?: boolean;
  onSendMessage: (text: string, imageData?: string) => Promise<void>;
  currentArtifact?: {
    events: CalendarEvent[];
    title: string;
    isOpen: boolean;
  };
  onArtifactOpen?: () => void;
  onArtifactClose?: () => void;
  userPicture?: string | null;
}

export function ChatInterface({
  messages,
  locale,
  isProcessing = false,
  onSendMessage,
  currentArtifact,
  onArtifactOpen,
  onArtifactClose,
  userPicture
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToastContext();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async () => {
    if (!inputValue.trim() && !attachedImage) return;
    if (isProcessing) return;

    const messageText = inputValue.trim();
    setInputValue('');
    setAttachedImage(null);

    await onSendMessage(messageText, attachedImage || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVoiceRecording = () => {
    if (!isRecording) {
      // Start recording
      setIsRecording(true);
      // TODO: Implement actual voice recording
      toast.info(locale === 'ko' ? '음성 녹음 시작' : 'Recording started');
    } else {
      // Stop recording
      setIsRecording(false);
      toast.info(locale === 'ko' ? '음성 녹음 종료' : 'Recording stopped');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto">
                <Plus className="w-8 h-8 text-white" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {locale === 'ko' ? '새로운 대화 시작' : 'Start a new conversation'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
              {locale === 'ko'
                ? '일정 관리에 대해 무엇이든 물어보세요. AI가 도와드립니다.'
                : 'Ask anything about managing your schedule. AI will help you.'}
            </p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isLastAssistantMessage =
                index === messages.length - 1 &&
                message.role === 'assistant';

              return (
                <ChatMessage
                  key={message.id}
                  message={message}
                  locale={locale}
                  isTyping={isProcessing && isLastAssistantMessage}
                  artifactEvents={
                    currentArtifact &&
                    message.data?.action?.type === 'list'
                      ? currentArtifact.events
                      : []
                  }
                  artifactTitle={currentArtifact?.title}
                  isArtifactOpen={currentArtifact?.isOpen}
                  onArtifactOpen={onArtifactOpen}
                  onArtifactClose={onArtifactClose}
                  userPicture={userPicture}
                />
              );
            })}

            {/* Typing Indicator */}
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-4 bg-white dark:bg-gray-900">
        {/* Attached Image Preview */}
        <AnimatePresence>
          {attachedImage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-3 relative inline-block"
            >
              <img
                src={attachedImage}
                alt="Attached"
                className="h-20 rounded-lg border border-gray-200 dark:border-gray-700"
              />
              <button
                onClick={() => setAttachedImage(null)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Field */}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={locale === 'ko' ? '메시지를 입력하세요...' : 'Type a message...'}
              rows={1}
              className="w-full px-4 py-3 pr-12 bg-gray-100 dark:bg-gray-800 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              style={{
                minHeight: '48px',
                maxHeight: '120px'
              }}
            />

            {/* Attachment Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute right-2 bottom-3 p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <Paperclip className="w-5 h-5" />
            </button>
          </div>

          {/* Voice Button */}
          <button
            onClick={handleVoiceRecording}
            className={`p-3 rounded-xl transition-all ${
              isRecording
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {isRecording ? (
              <StopCircle className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>

          {/* Send Button */}
          <button
            onClick={handleSubmit}
            disabled={(!inputValue.trim() && !attachedImage) || isProcessing}
            className={`p-3 rounded-xl transition-all ${
              (!inputValue.trim() && !attachedImage) || isProcessing
                ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>
    </div>
  );
}