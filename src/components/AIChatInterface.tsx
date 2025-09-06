'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Mic, Camera, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface AIChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: string, type: 'text' | 'voice' | 'image') => void;
}

export function AIChatInterface({ isOpen, onClose, onSubmit }: AIChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hi! Tell me about your schedule. You can type, speak, or share a screenshot.',
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    const userInput = input;
    setInput('');
    
    try {
      // Call the actual AI API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userInput,
          sessionId: Date.now().toString(),
        }),
      });

      const data = await response.json();
      
      // Handle the AI response
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: data.message || 'Sorry, I couldn\'t process your request.',
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
      
      // If there's an action, notify the parent component
      if (data.type === 'action' || data.type === 'data') {
        onSubmit(userInput, 'text');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, there was an error processing your request. Please try again.',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleVoiceInput = () => {
    setIsListening(!isListening);
    // Voice input logic here
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Image upload logic here
      const newMessage: Message = {
        id: Date.now().toString(),
        text: 'Uploaded screenshot',
        sender: 'user',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newMessage]);
      onSubmit('image', 'image');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Chat Interface */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 h-[85vh] flex flex-col rounded-t-3xl overflow-hidden"
            style={{ background: 'var(--bg-primary)' }}
          >
            {/* Header */}
            <div className="p-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">AI Assistant</h3>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Tell me about your schedule
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg transition-colors"
                  style={{ background: 'var(--surface-secondary)' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : ''
                    }`}
                    style={{
                      background: message.sender === 'ai' ? 'var(--surface-secondary)' : undefined
                    }}
                  >
                    <p className="text-sm">{message.text}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {message.timestamp.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            <div className="px-4 pb-2">
              <div className="flex gap-2 overflow-x-auto">
                {['Meeting tomorrow at 3pm', 'Lunch with team Friday', 'Doctor appointment'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors"
                    style={{
                      background: 'var(--surface-secondary)',
                      border: '1px solid var(--border-default)'
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-lg transition-colors"
                  style={{ background: 'var(--surface-secondary)' }}
                >
                  <Camera className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                
                <button
                  onClick={handleVoiceInput}
                  className={`p-2 rounded-lg transition-colors ${isListening ? 'text-red-500' : ''}`}
                  style={{ background: 'var(--surface-secondary)' }}
                >
                  <Mic className="w-5 h-5" />
                </button>
                
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type or speak..."
                  className="flex-1 px-4 py-2 rounded-lg"
                  style={{
                    background: 'var(--surface-secondary)',
                    border: '1px solid var(--border-default)'
                  }}
                />
                
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="p-2 rounded-lg transition-colors disabled:opacity-50"
                  style={{
                    background: input.trim() 
                      ? 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)' 
                      : 'var(--surface-secondary)'
                  }}
                >
                  <Send className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Safe area for iOS */}
            <div className="pb-safe" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}