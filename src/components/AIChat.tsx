'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useToastContext } from '@/providers/ToastProvider';
import type { AIMessage, SmartSuggestion, CalendarEvent } from '@/types';

interface AIChatProps {
    onEventSync?: () => void;
    sessionId: string;
    initialMessage?: string;
    onInitialMessageProcessed?: () => void;
    selectedEvent?: CalendarEvent | null;
}

const AIChat = forwardRef<any, AIChatProps>(({ onEventSync, sessionId, initialMessage, onInitialMessageProcessed, selectedEvent }, ref) => {
    const { toast } = useToastContext();
    const [messages, setMessages] = useState<AIMessage[]>([
        {
            id: '1',
            role: 'assistant',
            content: '안녕하세요! 무엇을 도와드릴까요?',
            timestamp: new Date(),
            type: 'text'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageData, setImageData] = useState<{ base64: string; mimeType: string } | null>(null);
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    const [pendingEventData, setPendingEventData] = useState<any>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
        setExpanded: (value: boolean) => {
            setIsExpanded(value);
            if (value) {
                setTimeout(() => inputRef.current?.focus(), 300);
            }
        }
    }));

    // Detect mobile device
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Initialize Web Speech API
    useEffect(() => {
        if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            const recognitionInstance = new SpeechRecognition();
            recognitionInstance.continuous = false;
            recognitionInstance.interimResults = true;
            recognitionInstance.lang = 'ko-KR';

            recognitionInstance.onresult = (event: any) => {
                const transcript = Array.from(event.results)
                    .map((result: any) => result[0])
                    .map((result: any) => result.transcript)
                    .join('');
                
                setInput(transcript);
                
                if (event.results[event.results.length - 1].isFinal) {
                    setIsListening(false);
                }
            };

            recognitionInstance.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
                toast.error('음성 인식 오류', '마이크 권한을 확인해주세요');
            };

            recognitionInstance.onend = () => {
                setIsListening(false);
            };

            setRecognition(recognitionInstance);
        }
    }, [toast]);

    const toggleVoiceInput = () => {
        if (!recognition) {
            toast.error('음성 인식 지원 불가', '브라우저가 음성 인식을 지원하지 않습니다');
            return;
        }

        if (isListening) {
            recognition.stop();
            setIsListening(false);
        } else {
            recognition.start();
            setIsListening(true);
            toast.info('음성 입력 시작', '말씀해주세요...');
        }
    };

    // Convert blob to base64 with proper MIME type extraction
    const blobToBase64 = (blob: Blob): Promise<{ base64: string; mimeType: string }> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                // Extract MIME type and base64 data separately
                const [header, base64] = dataUrl.split(',');
                const mimeType = header.match(/:(.*?);/)?.[1] || blob.type || 'image/png';
                resolve({ base64, mimeType });
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    // Handle paste event for images
    const handlePaste = async (e: React.ClipboardEvent) => {
        console.log('[handlePaste] Paste event triggered');
        const items = Array.from(e.clipboardData.items);
        console.log('[handlePaste] Clipboard items:', items.map(item => item.type));
        
        const imageItem = items.find(item => item.type.startsWith('image/'));
        
        if (!imageItem) {
            console.log('[handlePaste] No image found in clipboard');
            return;
        }
        console.log('[handlePaste] Image found:', imageItem.type);
        
        const blob = imageItem.getAsFile();
        if (!blob) return;
        
        // Check image size (5MB limit)
        const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
        if (blob.size > MAX_IMAGE_SIZE) {
            toast.error('이미지 크기 초과', '5MB 이하의 이미지를 사용해주세요');
            return;
        }
        
        // Show preview
        const previewUrl = URL.createObjectURL(blob);
        setImagePreview(previewUrl);
        
        try {
            // Convert to base64 with MIME type
            const { base64, mimeType } = await blobToBase64(blob);
            setImageData({ base64, mimeType });
            
            console.log('Image processed - Size:', blob.size, 'MIME type:', mimeType);
            toast.info('이미지 업로드됨', '전송 버튼을 눌러 일정을 분석하세요');
        } catch (error) {
            console.error('Image conversion error:', error);
            toast.error('이미지 처리 오류', '이미지를 업로드할 수 없습니다');
            setImagePreview(null);
            URL.revokeObjectURL(previewUrl);
        }
    };

    // Process image and extract event data with retry logic
    const processImage = async () => {
        console.log('[processImage] Starting...', { hasImageData: !!imageData });
        if (!imageData) {
            console.log('[processImage] No image data, returning');
            return;
        }
        
        setIsProcessingImage(true);
        
        console.log('[processImage] Processing image with MIME type:', imageData.mimeType);
        console.log('[processImage] Image data length:', imageData.base64?.length);
        
        const MAX_RETRIES = 2;
        const TIMEOUT_MS = 30000; // 30 seconds timeout
        let retries = 0;
        
        while (retries <= MAX_RETRIES) {
            try {
                // Create timeout promise
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Request timeout')), TIMEOUT_MS)
                );
                
                // Create fetch promise
                console.log(`[processImage] Attempt ${retries + 1} - Sending to API...`);
                const fetchPromise = fetch('/api/ai/process-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: imageData.base64,
                        mimeType: imageData.mimeType || 'image/png',
                        sessionId
                    })
                });
                
                // Race between fetch and timeout
                const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
                console.log(`[processImage] Response received:`, response.status);
                
                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.success && data.eventData) {
                    // Validate extracted event data
                    const eventDate = new Date(data.eventData.date + ' ' + data.eventData.time);
                    const now = new Date();
                    
                    // Check if date is valid
                    if (isNaN(eventDate.getTime())) {
                        toast.error('날짜 오류', '추출된 날짜가 유효하지 않습니다');
                        break;
                    }
                    
                    // Warn if date is in the past
                    if (eventDate < now) {
                        toast.warning('과거 일정', '추출된 일정이 과거 시점입니다');
                    }
                    
                    // Store the pending event data
                    setPendingEventData(data.eventData);
                    
                    // Show extracted event data to user for confirmation
                    const confirmMessage = `
스크린샷에서 다음 일정을 추출했습니다:

제목: ${data.eventData.title}
날짜: ${data.eventData.date}
시간: ${data.eventData.time}
장소: ${data.eventData.location || '미정'}
소요시간: ${data.eventData.duration}분

이 일정을 등록하시겠습니까? (예/아니오)
                    `.trim();
                    
                    const assistantMessage: AIMessage = {
                        id: Date.now().toString(),
                        role: 'assistant',
                        content: confirmMessage,
                        timestamp: new Date(),
                        type: 'text',
                        data: { pendingEvent: data.eventData }
                    };
                    
                    setMessages(prev => [...prev, assistantMessage]);
                    
                    // Set quick actions for confirmation
                    setSuggestions([
                        {
                            id: 'confirm-event',
                            title: '일정 등록',
                            action: `예, "${data.eventData.title}" 일정을 등록해주세요`
                        },
                        {
                            id: 'cancel-event',
                            title: '취소',
                            action: '아니오, 취소합니다'
                        },
                        {
                            id: 'edit-event',
                            title: '수정',
                            action: `"${data.eventData.title}" 일정을 수정하고 싶습니다`
                        }
                    ]);
                    
                    toast.success('이미지 분석 완료', '일정 정보를 추출했습니다');
                    break; // Success, exit retry loop
                } else {
                    throw new Error('일정 정보를 추출할 수 없습니다');
                }
                
            } catch (error: any) {
                console.error(`Image processing attempt ${retries + 1} failed:`, error);
                
                if (retries === MAX_RETRIES) {
                    // Final attempt failed
                    toast.error('이미지 처리 실패', error.message === 'Request timeout' 
                        ? '요청 시간이 초과되었습니다' 
                        : '이미지를 처리할 수 없습니다');
                    break; // Exit the retry loop
                } else {
                    // Retry after delay
                    retries++;
                    console.log(`Retrying... (attempt ${retries + 1}/${MAX_RETRIES + 1})`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * retries));
                }
            }
        }
        
        setIsProcessingImage(false);
        // Clear image data after processing
        setImageData(null);
        setImagePreview(null);
    };

    // Clear uploaded image
    const clearImage = () => {
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }
        setImagePreview(null);
        setImageData(null);
        toast.info('이미지 삭제됨', '이미지가 삭제되었습니다');
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 초기 메시지가 있을 때 자동으로 입력 필드에 설정
    useEffect(() => {
        if (initialMessage && initialMessage !== input) {
            setInput(initialMessage);
            setIsExpanded(true);
            setTimeout(() => {
                inputRef.current?.focus();
                onInitialMessageProcessed?.();
            }, 300);
        }
    }, [initialMessage, input, onInitialMessageProcessed]);

    // 선택된 일정이 변경되면 처리
    useEffect(() => {
        if (selectedEvent) {
            // 선택된 일정에 대한 퀵 액션 버튼 제공
            const eventActions: SmartSuggestion[] = [
                {
                    id: 'edit-title',
                    title: '제목 수정',
                    action: `"${selectedEvent.summary}" 일정의 제목을 변경해주세요`
                },
                {
                    id: 'change-time',
                    title: '시간 변경',
                    action: `"${selectedEvent.summary}" 일정의 시간을 변경해주세요`
                },
                {
                    id: 'add-location',
                    title: '장소 추가/수정',
                    action: `"${selectedEvent.summary}" 일정에 장소를 추가해주세요`
                },
                {
                    id: 'delete-event',
                    title: '일정 삭제',
                    action: `"${selectedEvent.summary}" 일정을 삭제해주세요`
                }
            ];
            setSuggestions(eventActions);
        }
    }, [selectedEvent]);

    const sendMessage = async (text?: string) => {
        const messageText = text || input;
        console.log('[sendMessage] Called with:', { 
            hasText: !!messageText?.trim(), 
            hasImageData: !!imageData,
            textLength: messageText?.length 
        });
        
        // If there's an image, process it first
        if (imageData && !messageText.trim()) {
            console.log('[sendMessage] Processing image (no text)');
            await processImage();
            return;
        }
        
        if (!messageText.trim()) {
            console.log('[sendMessage] No text and no image, returning');
            return;
        }

        const userMessage: AIMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: messageText,
            timestamp: new Date(),
            type: 'text'
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Check if this is a confirmation for pending event
            const isPendingEventConfirmation = pendingEventData && 
                (messageText.includes('예') || messageText.includes('등록'));
            
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageText,
                    sessionId,
                    selectedEventId: selectedEvent?.id, // 선택된 일정 ID 포함
                    pendingEventData: isPendingEventConfirmation ? pendingEventData : null
                })
            });

            const data = await response.json();

            const assistantMessage: AIMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.message,
                timestamp: new Date(),
                type: data.type,
                data: data.data
            };

            setMessages(prev => [...prev, assistantMessage]);

            if (data.suggestions) {
                setSuggestions(data.suggestions);
            }

            // 일정 관련 액션이면 동기화 및 토스트 알림
            if (data.action === 'event_created') {
                toast.success('일정이 생성되었습니다', data.eventSummary);
                setPendingEventData(null); // Clear pending event data
                onEventSync?.();
            } else if (data.action === 'event_updated') {
                toast.success('일정이 수정되었습니다', data.eventSummary);
                onEventSync?.();
            } else if (data.action === 'event_deleted') {
                toast.success('일정이 삭제되었습니다');
                onEventSync?.();
            } else if (messageText.includes('취소') || messageText.includes('아니오')) {
                setPendingEventData(null); // Clear pending event data on cancel
            }

        } catch (error) {
            console.error('Chat error:', error);
            toast.error('오류가 발생했습니다', '잠시 후 다시 시도해주세요');

            const errorMessage: AIMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.',
                timestamp: new Date(),
                type: 'text'
            };

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderMessage = (message: AIMessage) => {
        if (message.type === 'data' && message.data?.events) {
            return (
                <div>
                    <p style={{ margin: '0 0 10px 0' }}>{message.content}</p>
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {message.data.events.slice(0, 5).map((event: any) => (
                            <div key={event.id} style={{
                                padding: '8px',
                                marginBottom: '4px',
                                background: 'rgba(59, 130, 246, 0.1)',
                                borderRadius: '4px',
                                fontSize: '13px'
                            }}>
                                <strong>{event.summary}</strong>
                                <br />
                                <span style={{ color: '#666' }}>
                  {new Date(event.start?.dateTime || event.start?.date).toLocaleString('ko-KR')}
                </span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{message.content}</p>;
    };

    if (!isExpanded) {
        return (
            <button
                onClick={() => {
                    setIsExpanded(true);
                    setTimeout(() => inputRef.current?.focus(), 300);
                }}
                className="glass-heavy haptic-tap focus-ring"
                style={{
                    position: 'fixed',
                    bottom: isMobile ? 'var(--space-4)' : 'var(--space-6)',
                    right: isMobile ? 'var(--space-4)' : 'var(--space-6)',
                    width: '60px',
                    height: '60px',
                    borderRadius: 'var(--radius-full)',
                    padding: 0,
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: '0.5px solid rgba(255, 255, 255, 0.15)',
                    transition: 'var(--transition-smooth)',
                    transform: 'scale(1)',
                    boxShadow: `
                        0 4px 12px rgba(0, 0, 0, 0.2),
                        0 0 0 0.5px rgba(255, 255, 255, 0.1),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1)
                    `
                }}
                onMouseEnter={(e) => {
                    if (!isMobile) {
                        e.currentTarget.style.transform = 'scale(1.1)';
                        e.currentTarget.style.boxShadow = `
                            0 8px 24px rgba(0, 0, 0, 0.25),
                            0 0 0 0.5px rgba(255, 255, 255, 0.15),
                            inset 0 1px 0 rgba(255, 255, 255, 0.12)
                        `;
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isMobile) {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = `
                            0 4px 12px rgba(0, 0, 0, 0.2),
                            0 0 0 0.5px rgba(255, 255, 255, 0.1),
                            inset 0 1px 0 rgba(255, 255, 255, 0.1)
                        `;
                    }
                }}
                aria-label="AI 채팅 열기"
            >
                <div style={{
                    fontSize: '26px',
                    filter: 'grayscale(1) brightness(1.2)'
                }}>
                    <img 
                        src="/images/logo.svg" 
                        alt="Chat" 
                        style={{ width: '26px', height: '26px' }} 
                    />
                </div>
            </button>
        );
    }

    return (
        <div className="glass-ultra" style={{
            position: 'fixed',
            bottom: isMobile ? 0 : 'var(--space-6)',
            right: isMobile ? 0 : 'var(--space-6)',
            left: isMobile ? 0 : 'auto',
            width: isMobile ? '100%' : '400px',
            height: isMobile ? '100vh' : '600px',
            maxHeight: isMobile ? '100vh' : 'calc(100vh - 120px)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            borderRadius: isMobile ? 0 : 'var(--radius-2xl)',
            overflow: 'hidden',
            border: isMobile ? 'none' : '0.5px solid rgba(255, 255, 255, 0.1)',
            boxShadow: isMobile ? 'none' : `
                0 8px 32px rgba(0, 0, 0, 0.2),
                0 0 0 0.5px rgba(255, 255, 255, 0.08) inset
            `,
            animation: isMobile 
                ? 'slideInUp 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                : 'scaleIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            transformOrigin: 'bottom right'
        }}>
            {/* Header */}
            <div className="glass-dark" style={{
                padding: isMobile ? 'var(--space-4) var(--space-3)' : 'var(--space-4)',
                backdropFilter: 'blur(100px)',
                WebkitBackdropFilter: 'blur(100px)',
                borderBottom: '0.5px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                minHeight: isMobile ? '60px' : 'auto'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        filter: 'grayscale(1) brightness(1.2)'
                    }}>
                        <img 
                            src="/images/logo.svg" 
                            alt="AI Assistant" 
                            style={{ width: '20px', height: '20px' }} 
                        />
                    </div>
                    <div>
                        <h3 className="text-on-glass-strong" style={{ 
                            margin: 0, 
                            fontSize: 'var(--font-base)',
                            fontWeight: '600',
                            letterSpacing: 'var(--tracking-tight)'
                        }}>AI Assistant</h3>
                        <p style={{ 
                            margin: 0, 
                            fontSize: 'var(--font-xs)', 
                            color: selectedEvent ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                            letterSpacing: 'var(--tracking-normal)',
                            display: isMobile ? 'none' : 'block',
                            fontWeight: selectedEvent ? '500' : '400'
                        }}>
                            {selectedEvent ? selectedEvent.summary : 'Natural language calendar'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setIsExpanded(false)}
                    className="interactive focus-ring"
                    style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: 'var(--radius-md)',
                        padding: 0,
                        fontSize: '20px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '0.5px solid rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'var(--transition-fast)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                        if (!isMobile) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!isMobile) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        }
                    }}
                    aria-label="채팅 닫기"
                >
                    ×
                </button>
            </div>

            {/* Messages */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: 'var(--space-4)',
                background: 'rgba(0, 0, 0, 0.2)',
                WebkitOverflowScrolling: 'touch',
                scrollBehavior: 'smooth'
            }}>
                {messages.map((message) => (
                    <div
                        key={message.id}
                        style={{
                            marginBottom: '12px',
                            display: 'flex',
                            justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                        }}
                    >
                        <div style={{
                            maxWidth: '85%',
                            padding: 'var(--space-3) var(--space-4)',
                            borderRadius: message.role === 'user' ? 'var(--radius-lg) var(--radius-lg) var(--radius-xs) var(--radius-lg)' : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-xs)',
                            background: message.role === 'user'
                                ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.1) 100%)'
                                : 'rgba(255, 255, 255, 0.05)',
                            color: 'var(--text-primary)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            border: '0.5px solid rgba(255, 255, 255, 0.06)',
                            boxShadow: message.role === 'user' 
                                ? '0 2px 8px rgba(0, 0, 0, 0.1)'
                                : '0 1px 4px rgba(0, 0, 0, 0.05)'
                        }}>
                            {renderMessage(message)}
                            <div style={{
                                fontSize: '11px',
                                opacity: 0.7,
                                marginTop: '4px'
                            }}>
                                {message.timestamp.toLocaleTimeString('ko-KR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '12px' }}>
                        <div className="glass-light shimmer" style={{
                        padding: '12px 16px',
                        borderRadius: '16px',
                        color: 'rgba(255, 255, 255, 0.8)'
                        }}>
                            <div>생각하는 중...</div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Enhanced Suggestions */}
            {suggestions.length > 0 && (
                <div className="glass-light" style={{
                    padding: isMobile ? 'var(--space-3)' : 'var(--space-4)',
                    borderTop: '0.5px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)'
                }}>
                    <p style={{
                        fontSize: 'var(--font-xs)',
                        color: 'var(--text-tertiary)',
                        margin: 0,
                        marginBottom: 'var(--space-1)',
                        fontWeight: '500',
                        letterSpacing: 'var(--tracking-wide)',
                        textTransform: 'uppercase'
                    }}>빠른 제안</p>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                        gap: 'var(--space-2)',
                        maxHeight: '160px',
                        overflowY: 'auto'
                    }}>
                        {suggestions.map((suggestion) => (
                            <button
                                key={suggestion.id}
                                onClick={() => sendMessage(suggestion.action)}
                                disabled={isLoading}
                                className="glass-medium interactive hover-lift focus-ring"
                                style={{
                                    padding: 'var(--space-3)',
                                    fontSize: 'var(--font-sm)',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    color: 'var(--text-primary)',
                                    border: '0.5px solid rgba(255, 255, 255, 0.12)',
                                    textAlign: 'left',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-2)',
                                    minHeight: '48px',
                                    transition: 'var(--transition-fast)',
                                    background: 'rgba(255, 255, 255, 0.05)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                                }}
                            >
                                <span style={{ 
                                    fontSize: '16px',
                                    filter: 'grayscale(0.3)'
                                }}>
                                    <img 
                                        src="/images/logo.svg" 
                                        alt="Suggestion" 
                                        style={{ width: '14px', height: '14px' }} 
                                    />
                                </span>
                                <span style={{
                                    flex: 1,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {suggestion.title}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Image Preview */}
            {imagePreview && (
                <div style={{
                    padding: 'var(--space-3)',
                    borderTop: '0.5px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(0, 0, 0, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)'
                }}>
                    <img 
                        src={imagePreview} 
                        alt="Preview" 
                        style={{
                            width: '60px',
                            height: '60px',
                            objectFit: 'cover',
                            borderRadius: 'var(--radius-md)',
                            border: '0.5px solid rgba(255, 255, 255, 0.2)'
                        }}
                    />
                    <div style={{ flex: 1 }}>
                        <p style={{
                            margin: 0,
                            fontSize: 'var(--font-sm)',
                            color: 'var(--text-primary)',
                            fontWeight: '500'
                        }}>
                            {isProcessingImage ? '이미지 분석 중...' : '스크린샷 준비됨'}
                        </p>
                        <p style={{
                            margin: '4px 0 0 0',
                            fontSize: 'var(--font-xs)',
                            color: 'var(--text-tertiary)'
                        }}>
                            {isProcessingImage ? 'AI가 일정 정보를 추출하고 있습니다 (최대 30초)' : '전송 버튼을 눌러 일정을 분석하세요'}
                        </p>
                        {isProcessingImage && (
                            <div style={{
                                marginTop: '8px',
                                height: '2px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '1px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    background: 'var(--accent-primary)',
                                    width: '0%',
                                    animation: 'progressBar 30s linear forwards'
                                }} />
                            </div>
                        )}
                    </div>
                    {isProcessingImage ? (
                        <div style={{
                            width: '24px',
                            height: '24px',
                            border: '2px solid rgba(255, 255, 255, 0.2)',
                            borderTopColor: 'var(--accent-primary)',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }} />
                    ) : (
                        <button
                            onClick={clearImage}
                            className="interactive focus-ring"
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: 'var(--radius-full)',
                                padding: 0,
                                fontSize: '16px',
                                background: 'rgba(255, 59, 48, 0.2)',
                                border: '0.5px solid rgba(255, 59, 48, 0.4)',
                                color: 'rgba(255, 59, 48, 0.9)',
                                cursor: 'pointer',
                                transition: 'var(--transition-fast)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 59, 48, 0.3)';
                                e.currentTarget.style.borderColor = 'rgba(255, 59, 48, 0.6)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 59, 48, 0.2)';
                                e.currentTarget.style.borderColor = 'rgba(255, 59, 48, 0.4)';
                            }}
                            title="이미지 삭제"
                            aria-label="이미지 삭제"
                        >
                            ✕
                        </button>
                    )}
                </div>
            )}

            {/* Input */}
            <div className="glass-dark" style={{
                padding: isMobile ? 'var(--space-3)' : 'var(--space-4)',
                borderTop: '0.5px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(50px)',
                WebkitBackdropFilter: 'blur(50px)',
                paddingBottom: isMobile ? 'calc(var(--space-3) + env(safe-area-inset-bottom))' : 'var(--space-4)'
            }}>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    {/* Voice input button */}
                    <button
                        onClick={toggleVoiceInput}
                        disabled={isLoading}
                        className="haptic-tap focus-ring"
                        style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: 'var(--radius-full)',
                            padding: 0,
                            fontSize: '18px',
                            background: isListening 
                                ? 'rgba(255, 59, 48, 0.9)'
                                : 'rgba(255, 255, 255, 0.08)',
                            color: isListening ? 'white' : 'var(--text-secondary)',
                            border: '0.5px solid rgba(255, 255, 255, 0.12)',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            transition: 'var(--transition-fast)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            animation: isListening ? 'pulse 1.5s ease-in-out infinite' : 'none'
                        }}
                        title={isListening ? '음성 입력 중...' : '음성 입력'}
                        aria-label={isListening ? '음성 입력 중지' : '음성 입력 시작'}
                    >
                        {isListening ? '🔴' : '🎤'}
                    </button>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
                        onPaste={handlePaste}
                        placeholder={isListening ? '듣는 중...' : '메시지를 입력하거나 이미지를 붙여넣으세요...'}
                        disabled={isLoading || isProcessingImage}
                        className="focus-ring"
                        style={{
                            flex: 1,
                            padding: 'var(--space-3) var(--space-4)',
                            borderRadius: 'var(--radius-full)',
                            fontSize: isMobile ? 'var(--font-base)' : 'var(--font-sm)',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '0.5px solid rgba(255, 255, 255, 0.12)',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            transition: 'var(--transition-fast)',
                            letterSpacing: 'var(--tracking-normal)',
                            minHeight: '44px'
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                        }}
                        aria-label="메시지 입력"
                    />
                    <button
                        onClick={() => sendMessage()}
                        disabled={isLoading || isProcessingImage || (!input.trim() && !imageData)}
                        className="haptic-tap focus-ring"
                        style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: 'var(--radius-full)',
                            padding: 0,
                            fontSize: '18px',
                            background: (isLoading || isProcessingImage || (!input.trim() && !imageData))
                                ? 'rgba(255, 255, 255, 0.05)'
                                : imageData 
                                    ? 'rgba(138, 43, 226, 0.9)'  // Purple for image analysis
                                    : 'rgba(0, 122, 255, 0.9)',  // Blue for text
                            color: (isLoading || isProcessingImage || (!input.trim() && !imageData))
                                ? 'var(--text-tertiary)'
                                : 'white',
                            border: (isLoading || isProcessingImage || (!input.trim() && !imageData))
                                ? '0.5px solid rgba(255, 255, 255, 0.08)'
                                : 'none',
                            cursor: (isLoading || isProcessingImage || (!input.trim() && !imageData)) ? 'not-allowed' : 'pointer',
                            transition: 'var(--transition-fast)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '600'
                        }}
                        title={imageData ? '이미지 분석' : '메시지 전송'}
                        aria-label={imageData ? '이미지 분석' : '메시지 전송'}
                    >
                        {imageData ? '🔍' : '↑'}
                    </button>
                </div>
            </div>
        </div>
    );
});

AIChat.displayName = 'AIChat';

export default AIChat;