import type {
    CalendarEvent,
    AIResponse,
    UserContext,
    SmartSuggestion
} from '@/types';
import { geminiService } from './GeminiService';
import { contextManager } from './ContextManager';
import { teamScheduler } from '../calendar/TeamScheduler';
import type { PreparationTask } from '../calendar/TeamScheduler';

export interface MeetingPreparationConfig {
    autoGenerateAgenda: boolean;
    autoShareDocuments: boolean;
    reminderTime: number; // minutes before meeting
    summaryAfterMeeting: boolean;
    actionItemTracking: boolean;
}

export interface MeetingAgenda {
    title: string;
    objectives: string[];
    topics: AgendaTopic[];
    preparationItems: string[];
    expectedOutcomes: string[];
    timeAllocation: Map<string, number>;
}

export interface AgendaTopic {
    title: string;
    description: string;
    presenter?: string;
    duration: number;
    priority: 'low' | 'medium' | 'high';
    materials?: string[];
    discussionPoints?: string[];
}

export interface MeetingMaterials {
    documents: Document[];
    references: Reference[];
    actionItems: ActionItem[];
    previousMeetingNotes?: string;
}

export interface Document {
    id: string;
    title: string;
    type: 'presentation' | 'document' | 'spreadsheet' | 'pdf' | 'link';
    url?: string;
    content?: string;
    lastModified: Date;
    owner: string;
    sharedWith: string[];
}

export interface Reference {
    title: string;
    url: string;
    description?: string;
    relevance: 'required' | 'recommended' | 'optional';
}

export interface ActionItem {
    id: string;
    title: string;
    description: string;
    assignee: string;
    dueDate: Date;
    status: 'pending' | 'in-progress' | 'completed' | 'blocked';
    meetingId: string;
    createdAt: Date;
    completedAt?: Date;
    blockedReason?: string;
}

export interface MeetingSummary {
    meetingId: string;
    title: string;
    date: Date;
    duration: number;
    attendees: AttendeeParticipation[];
    keyDiscussions: string[];
    decisions: Decision[];
    actionItems: ActionItem[];
    nextSteps: string[];
    followUpMeeting?: {
        suggestedDate: Date;
        topics: string[];
    };
}

export interface AttendeeParticipation {
    email: string;
    name: string;
    attended: boolean;
    contributionLevel?: 'low' | 'medium' | 'high';
    keyPoints?: string[];
}

export interface Decision {
    topic: string;
    decision: string;
    rationale?: string;
    stakeholders: string[];
    implementationDate?: Date;
}

export class MeetingPreparationService {
    private config: MeetingPreparationConfig = {
        autoGenerateAgenda: true,
        autoShareDocuments: true,
        reminderTime: 30,
        summaryAfterMeeting: true,
        actionItemTracking: true
    };

    private meetingHistory: Map<string, MeetingSummary> = new Map();
    private actionItemsTracker: Map<string, ActionItem[]> = new Map();

    /**
     * 회의 준비 자동화
     */
    async prepareMeeting(
        event: CalendarEvent,
        userContext: UserContext,
        relatedEvents?: CalendarEvent[]
    ): Promise<{
        agenda: MeetingAgenda;
        materials: MeetingMaterials;
        tasks: PreparationTask[];
        suggestions: SmartSuggestion[];
    }> {
        // 1. 회의 유형 분석
        const meetingType = this.analyzeMeetingType(event);

        // 2. 아젠다 생성
        const agenda = await this.generateAgenda(event, meetingType, userContext);

        // 3. 관련 자료 수집
        const materials = await this.gatherMaterials(event, relatedEvents);

        // 4. 준비 태스크 생성
        const tasks = this.createPreparationTasks(event, agenda, materials);

        // 5. 스마트 제안 생성
        const suggestions = await this.generateSmartSuggestions(
            event,
            agenda,
            materials,
            userContext
        );

        // 6. 자동 공유 (설정된 경우)
        if (this.config.autoShareDocuments) {
            await this.sharePreparationMaterials(event, agenda, materials);
        }

        return {
            agenda,
            materials,
            tasks,
            suggestions
        };
    }

    /**
     * 회의 유형 분석
     */
    private analyzeMeetingType(event: CalendarEvent): string {
        const title = event.summary.toLowerCase();
        const description = (event.description || '').toLowerCase();
        const attendeeCount = event.attendees?.length || 0;

        if (title.includes('standup') || title.includes('데일리')) {
            return 'standup';
        }
        if (title.includes('1:1') || attendeeCount === 2) {
            return 'one-on-one';
        }
        if (title.includes('review') || title.includes('리뷰')) {
            return 'review';
        }
        if (title.includes('planning') || title.includes('계획')) {
            return 'planning';
        }
        if (title.includes('retrospective') || title.includes('회고')) {
            return 'retrospective';
        }
        if (title.includes('workshop') || title.includes('워크샵')) {
            return 'workshop';
        }
        if (title.includes('interview') || title.includes('면접')) {
            return 'interview';
        }
        if (title.includes('all-hands') || attendeeCount > 20) {
            return 'all-hands';
        }

        return 'general';
    }

    /**
     * 아젠다 생성
     */
    private async generateAgenda(
        event: CalendarEvent,
        meetingType: string,
        userContext: UserContext
    ): Promise<MeetingAgenda> {
        const duration = this.calculateDuration(event);
        
        // AI를 사용한 아젠다 생성
        const prompt = `
다음 회의의 아젠다를 생성해주세요:
- 제목: ${event.summary}
- 유형: ${meetingType}
- 설명: ${event.description || '없음'}
- 참석자: ${event.attendees?.map(a => a.email).join(', ') || '미정'}
- 시간: ${duration}분

다음 형식으로 응답해주세요:
1. 회의 목표 (3-5개)
2. 주요 논의 주제 (시간 배분 포함)
3. 준비 사항
4. 예상 결과물
`;

        const aiResponseText = await geminiService.processMessage(prompt, userContext);
        
        // AI 응답을 AIResponse 형태로 변환
        const aiResponse: AIResponse = {
            type: 'data',
            message: aiResponseText,
            data: { text: aiResponseText }
        };
        
        // AI 응답 파싱
        const agenda = this.parseAgendaFromAIResponse(aiResponse, event, meetingType, duration);

        return agenda;
    }

    /**
     * AI 응답에서 아젠다 파싱
     */
    private parseAgendaFromAIResponse(
        aiResponse: AIResponse,
        event: CalendarEvent,
        meetingType: string,
        duration: number
    ): MeetingAgenda {
        // 기본 아젠다 템플릿
        const defaultAgenda: MeetingAgenda = {
            title: event.summary,
            objectives: [],
            topics: [],
            preparationItems: [],
            expectedOutcomes: [],
            timeAllocation: new Map()
        };

        // 회의 유형별 기본 아젠다
        const typeSpecificAgendas: Record<string, Partial<MeetingAgenda>> = {
            standup: {
                objectives: ['어제 완료한 작업 공유', '오늘 할 작업 공유', '블로커 논의'],
                topics: [
                    {
                        title: '진행 상황 공유',
                        description: '각자 어제 한 일과 오늘 할 일 공유',
                        duration: 10,
                        priority: 'high'
                    },
                    {
                        title: '블로커 논의',
                        description: '진행을 막는 이슈 논의',
                        duration: 5,
                        priority: 'high'
                    }
                ],
                expectedOutcomes: ['팀 동기화', '블로커 해결 방안']
            },
            planning: {
                objectives: ['스프린트 목표 설정', '백로그 우선순위 정하기', '작업 할당'],
                topics: [
                    {
                        title: '스프린트 목표 설정',
                        description: '이번 스프린트의 주요 목표 정의',
                        duration: 20,
                        priority: 'high'
                    },
                    {
                        title: '백로그 리뷰',
                        description: '우선순위 높은 아이템 검토',
                        duration: 40,
                        priority: 'high'
                    },
                    {
                        title: '작업 할당',
                        description: '팀원별 작업 분배',
                        duration: 30,
                        priority: 'medium'
                    }
                ],
                preparationItems: ['백로그 정리', '이전 스프린트 회고 내용 검토'],
                expectedOutcomes: ['스프린트 백로그', '작업 할당표']
            },
            review: {
                objectives: ['작업 결과 검토', '피드백 수집', '개선 사항 도출'],
                topics: [
                    {
                        title: '데모',
                        description: '완료된 기능 시연',
                        duration: 30,
                        priority: 'high'
                    },
                    {
                        title: '피드백 세션',
                        description: '이해관계자 피드백',
                        duration: 20,
                        priority: 'high'
                    },
                    {
                        title: '다음 단계 논의',
                        description: '향후 계획 수립',
                        duration: 10,
                        priority: 'medium'
                    }
                ],
                expectedOutcomes: ['피드백 정리', '개선 사항 목록']
            },
            retrospective: {
                objectives: ['잘한 점 공유', '개선할 점 도출', '액션 아이템 정의'],
                topics: [
                    {
                        title: 'What went well',
                        description: '잘했던 점 공유',
                        duration: 20,
                        priority: 'high'
                    },
                    {
                        title: 'What could be improved',
                        description: '개선이 필요한 부분',
                        duration: 20,
                        priority: 'high'
                    },
                    {
                        title: 'Action items',
                        description: '구체적인 개선 방안',
                        duration: 20,
                        priority: 'high'
                    }
                ],
                expectedOutcomes: ['회고 문서', '개선 액션 아이템']
            }
        };

        // 회의 유형에 맞는 기본 아젠다 적용
        const typeAgenda = typeSpecificAgendas[meetingType] || {};
        const agenda = { ...defaultAgenda, ...typeAgenda };

        // AI 응답이 있으면 파싱하여 추가/수정
        if (aiResponse.message) {
            // 간단한 파싱 로직 (실제로는 더 정교한 파싱 필요)
            const lines = aiResponse.message.split('\n');
            lines.forEach(line => {
                if (line.includes('목표') || line.includes('objective')) {
                    // 목표 추가
                }
                if (line.includes('주제') || line.includes('topic')) {
                    // 주제 추가
                }
            });
        }

        // 시간 배분 계산
        if (agenda.topics.length > 0) {
            const totalAllocated = agenda.topics.reduce((sum, t) => sum + t.duration, 0);
            const buffer = Math.max(5, duration - totalAllocated);
            
            agenda.timeAllocation.set('주요 논의', totalAllocated);
            agenda.timeAllocation.set('버퍼/Q&A', buffer);
        }

        return agenda;
    }

    /**
     * 관련 자료 수집
     */
    private async gatherMaterials(
        event: CalendarEvent,
        relatedEvents?: CalendarEvent[]
    ): Promise<MeetingMaterials> {
        const materials: MeetingMaterials = {
            documents: [],
            references: [],
            actionItems: [],
            previousMeetingNotes: undefined
        };

        // 1. 이전 회의 노트 찾기
        if (relatedEvents && relatedEvents.length > 0) {
            const previousMeeting = this.findPreviousMeeting(event, relatedEvents);
            if (previousMeeting) {
                const summary = this.meetingHistory.get(previousMeeting.id || '');
                if (summary) {
                    materials.previousMeetingNotes = this.formatMeetingSummary(summary);
                }
            }
        }

        // 2. 관련 액션 아이템 찾기
        const relatedActionItems = this.findRelatedActionItems(event);
        materials.actionItems = relatedActionItems;

        // 3. 회의 설명에서 링크 추출
        if (event.description) {
            const links = this.extractLinks(event.description);
            materials.references = links.map(link => ({
                title: link.text || 'Reference',
                url: link.url,
                relevance: 'recommended' as const
            }));
        }

        // 4. Mock 문서 추가 (실제로는 Google Drive API 등과 연동)
        materials.documents = this.getMockDocuments(event);

        return materials;
    }

    /**
     * 이전 회의 찾기
     */
    private findPreviousMeeting(
        currentEvent: CalendarEvent,
        relatedEvents: CalendarEvent[]
    ): CalendarEvent | undefined {
        const currentStart = new Date(currentEvent.start?.dateTime || '');
        
        // 제목이 비슷하고 이전에 있었던 회의 찾기
        const previousMeetings = relatedEvents.filter(event => {
            const eventStart = new Date(event.start?.dateTime || '');
            return (
                eventStart < currentStart &&
                this.isSimilarMeeting(currentEvent, event)
            );
        });

        // 가장 최근 회의 반환
        return previousMeetings.sort((a, b) => {
            const aStart = new Date(a.start?.dateTime || '');
            const bStart = new Date(b.start?.dateTime || '');
            return bStart.getTime() - aStart.getTime();
        })[0];
    }

    /**
     * 유사한 회의인지 확인
     */
    private isSimilarMeeting(event1: CalendarEvent, event2: CalendarEvent): boolean {
        const title1 = event1.summary.toLowerCase();
        const title2 = event2.summary.toLowerCase();

        // 제목 유사도 체크
        const commonWords = title1.split(' ').filter(word => 
            title2.includes(word) && word.length > 2
        );

        return commonWords.length >= 2 || title1.includes(title2) || title2.includes(title1);
    }

    /**
     * 관련 액션 아이템 찾기
     */
    private findRelatedActionItems(event: CalendarEvent): ActionItem[] {
        const allActionItems: ActionItem[] = [];
        
        // 참석자별 액션 아이템 수집
        event.attendees?.forEach(attendee => {
            const items = this.actionItemsTracker.get(attendee.email) || [];
            allActionItems.push(...items.filter(item => 
                item.status !== 'completed' &&
                new Date(item.dueDate) <= new Date(event.start?.dateTime || '')
            ));
        });

        return allActionItems;
    }

    /**
     * 링크 추출
     */
    private extractLinks(text: string): { url: string; text?: string }[] {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const matches = text.match(urlRegex) || [];
        
        return matches.map(url => ({
            url,
            text: this.getLinkTitle(url)
        }));
    }

    /**
     * 링크 제목 추출
     */
    private getLinkTitle(url: string): string {
        if (url.includes('docs.google.com')) return 'Google Docs';
        if (url.includes('sheets.google.com')) return 'Google Sheets';
        if (url.includes('slides.google.com')) return 'Google Slides';
        if (url.includes('drive.google.com')) return 'Google Drive';
        if (url.includes('github.com')) return 'GitHub';
        if (url.includes('jira')) return 'Jira';
        if (url.includes('confluence')) return 'Confluence';
        if (url.includes('notion')) return 'Notion';
        if (url.includes('figma')) return 'Figma';
        
        return 'Link';
    }

    /**
     * Mock 문서 생성
     */
    private getMockDocuments(event: CalendarEvent): Document[] {
        const documents: Document[] = [];
        const meetingType = this.analyzeMeetingType(event);

        if (meetingType === 'planning') {
            documents.push({
                id: 'doc-1',
                title: '스프린트 백로그',
                type: 'spreadsheet',
                url: 'https://sheets.google.com/example',
                lastModified: new Date(),
                owner: 'team@example.com',
                sharedWith: event.attendees?.map(a => a.email) || []
            });
        }

        if (meetingType === 'review') {
            documents.push({
                id: 'doc-2',
                title: '데모 프레젠테이션',
                type: 'presentation',
                url: 'https://slides.google.com/example',
                lastModified: new Date(),
                owner: 'presenter@example.com',
                sharedWith: event.attendees?.map(a => a.email) || []
            });
        }

        return documents;
    }

    /**
     * 준비 태스크 생성
     */
    private createPreparationTasks(
        event: CalendarEvent,
        agenda: MeetingAgenda,
        materials: MeetingMaterials
    ): PreparationTask[] {
        const tasks: PreparationTask[] = [];
        const meetingStart = new Date(event.start?.dateTime || '');
        const meetingType = this.analyzeMeetingType(event);

        // 기본 준비 태스크
        tasks.push({
            task: '아젠다 검토 및 준비',
            priority: 'high',
            dueDate: new Date(meetingStart.getTime() - 24 * 60 * 60 * 1000), // 1일 전
            estimatedTime: 15
        });

        // 자료 준비 태스크
        if (materials.documents.length === 0) {
            tasks.push({
                task: '관련 자료 준비 및 공유',
                priority: 'medium',
                dueDate: new Date(meetingStart.getTime() - 2 * 60 * 60 * 1000), // 2시간 전
                estimatedTime: 30
            });
        }

        // 회의 유형별 특별 태스크
        if (meetingType === 'presentation' || meetingType === 'review') {
            tasks.push({
                task: '프레젠테이션 자료 최종 점검',
                priority: 'high',
                dueDate: new Date(meetingStart.getTime() - 60 * 60 * 1000), // 1시간 전
                estimatedTime: 20
            });
        }

        if (meetingType === 'interview') {
            tasks.push({
                task: '면접 질문 준비',
                priority: 'high',
                dueDate: new Date(meetingStart.getTime() - 24 * 60 * 60 * 1000),
                estimatedTime: 60
            });
            tasks.push({
                task: '지원자 이력서 및 포트폴리오 검토',
                priority: 'high',
                dueDate: new Date(meetingStart.getTime() - 2 * 60 * 60 * 1000),
                estimatedTime: 30
            });
        }

        // 액션 아이템 관련 태스크
        const pendingItems = materials.actionItems.filter(item => item.status === 'pending');
        if (pendingItems.length > 0) {
            tasks.push({
                task: `미완료 액션 아이템 ${pendingItems.length}개 처리`,
                priority: 'high',
                dueDate: new Date(meetingStart.getTime() - 24 * 60 * 60 * 1000),
                estimatedTime: pendingItems.length * 20
            });
        }

        return tasks;
    }

    /**
     * 스마트 제안 생성
     */
    private async generateSmartSuggestions(
        event: CalendarEvent,
        agenda: MeetingAgenda,
        materials: MeetingMaterials,
        userContext: UserContext
    ): Promise<SmartSuggestion[]> {
        const suggestions: SmartSuggestion[] = [];
        const meetingType = this.analyzeMeetingType(event);

        // 시간 관련 제안
        const duration = this.calculateDuration(event);
        if (duration > 60) {
            suggestions.push({
                id: 'sug-1',
                title: '휴식 시간 추가',
                action: `${Math.floor(duration / 60)}시간 회의입니다. 중간에 5-10분 휴식을 고려하세요.`,
                type: 'tip',
                confidence: 0.9
            });
        }

        // 참석자 관련 제안
        const attendeeCount = event.attendees?.length || 0;
        if (attendeeCount > 8) {
            suggestions.push({
                id: 'sug-2',
                title: '퍼실리테이터 지정',
                action: '참석자가 많습니다. 회의 진행자를 미리 지정하면 효율적입니다.',
                type: 'tip',
                confidence: 0.85
            });
        }

        // 액션 아이템 관련 제안
        if (materials.actionItems.length > 0) {
            const overdue = materials.actionItems.filter(item => 
                new Date(item.dueDate) < new Date() && item.status !== 'completed'
            );
            if (overdue.length > 0) {
                suggestions.push({
                    id: 'sug-3',
                    title: '지연된 액션 아이템 검토',
                    action: `${overdue.length}개의 지연된 액션 아이템이 있습니다. 회의에서 논의가 필요합니다.`,
                    type: 'warning',
                    confidence: 1.0
                });
            }
        }

        // 회의 유형별 제안
        const typeSpecificSuggestions = this.getTypeSpecificSuggestions(meetingType, event, agenda);
        suggestions.push(...typeSpecificSuggestions);

        // 시간대 관련 제안
        const meetingHour = new Date(event.start?.dateTime || '').getHours();
        if (meetingHour < 9 || meetingHour > 17) {
            suggestions.push({
                id: 'sug-4',
                title: '비정규 시간 회의',
                action: '업무 시간 외 회의입니다. 참석자들의 동의를 확인하세요.',
                type: 'warning',
                confidence: 0.8
            });
        }

        return suggestions;
    }

    /**
     * 회의 유형별 제안
     */
    private getTypeSpecificSuggestions(
        meetingType: string,
        event: CalendarEvent,
        agenda: MeetingAgenda
    ): SmartSuggestion[] {
        const suggestions: SmartSuggestion[] = [];

        switch (meetingType) {
            case 'standup':
                suggestions.push({
                    id: 'type-1',
                    title: '타임박스 설정',
                    action: '각 팀원당 2-3분으로 시간을 제한하여 효율적인 진행을 도모하세요.',
                    type: 'tip',
                    confidence: 0.9
                });
                break;

            case 'planning':
                suggestions.push({
                    id: 'type-2',
                    title: '스토리 포인트 준비',
                    action: '백로그 아이템의 스토리 포인트를 미리 추정해두면 시간을 절약할 수 있습니다.',
                    type: 'tip',
                    confidence: 0.85
                });
                break;

            case 'retrospective':
                suggestions.push({
                    id: 'type-3',
                    title: '익명 피드백 도구',
                    action: '솔직한 피드백을 위해 익명 도구 사용을 고려하세요.',
                    type: 'tip',
                    confidence: 0.8
                });
                break;

            case 'interview':
                suggestions.push({
                    id: 'type-4',
                    title: '평가 기준 공유',
                    action: '면접관들과 평가 기준을 사전에 공유하고 동기화하세요.',
                    type: 'tip',
                    confidence: 0.95
                });
                break;
        }

        return suggestions;
    }

    /**
     * 준비 자료 공유
     */
    private async sharePreparationMaterials(
        event: CalendarEvent,
        agenda: MeetingAgenda,
        materials: MeetingMaterials
    ): Promise<void> {
        // 실제로는 이메일이나 슬랙 등으로 공유
        console.log('Sharing preparation materials for meeting:', event.summary);
        
        // Mock 구현
        const shareData = {
            meetingTitle: event.summary,
            meetingTime: event.start?.dateTime,
            agenda: this.formatAgenda(agenda),
            materials: materials.documents.map(d => ({
                title: d.title,
                url: d.url
            })),
            actionItems: materials.actionItems.map(item => ({
                title: item.title,
                assignee: item.assignee,
                dueDate: item.dueDate
            }))
        };

        // 참석자들에게 알림 (실제로는 이메일/슬랙 API 호출)
        event.attendees?.forEach(attendee => {
            console.log(`Notifying ${attendee.email} about meeting preparation`);
        });
    }

    /**
     * 회의 후 요약 생성
     */
    async generateMeetingSummary(
        event: CalendarEvent,
        notes: string,
        decisions: Decision[],
        actionItems: ActionItem[]
    ): Promise<MeetingSummary> {
        const summary: MeetingSummary = {
            meetingId: event.id || '',
            title: event.summary,
            date: new Date(event.start?.dateTime || ''),
            duration: this.calculateDuration(event),
            attendees: this.analyzeAttendeeParticipation(event, notes),
            keyDiscussions: this.extractKeyDiscussions(notes),
            decisions,
            actionItems,
            nextSteps: this.identifyNextSteps(actionItems, decisions),
            followUpMeeting: this.suggestFollowUp(event, actionItems)
        };

        // 요약 저장
        this.meetingHistory.set(summary.meetingId, summary);

        // 액션 아이템 추적
        actionItems.forEach(item => {
            const assigneeItems = this.actionItemsTracker.get(item.assignee) || [];
            assigneeItems.push(item);
            this.actionItemsTracker.set(item.assignee, assigneeItems);
        });

        return summary;
    }

    /**
     * 참석자 참여도 분석
     */
    private analyzeAttendeeParticipation(
        event: CalendarEvent,
        notes: string
    ): AttendeeParticipation[] {
        return (event.attendees || []).map(attendee => ({
            email: attendee.email,
            name: attendee.displayName || attendee.email,
            attended: attendee.responseStatus === 'accepted',
            contributionLevel: this.assessContribution(attendee.email, notes),
            keyPoints: this.extractAttendeePoints(attendee.email, notes)
        }));
    }

    /**
     * 기여도 평가
     */
    private assessContribution(email: string, notes: string): 'low' | 'medium' | 'high' {
        const mentions = (notes.match(new RegExp(email.split('@')[0], 'gi')) || []).length;
        
        if (mentions >= 5) return 'high';
        if (mentions >= 2) return 'medium';
        return 'low';
    }

    /**
     * 참석자별 주요 포인트 추출
     */
    private extractAttendeePoints(email: string, notes: string): string[] {
        // 간단한 구현 - 실제로는 더 정교한 NLP 필요
        const name = email.split('@')[0];
        const regex = new RegExp(`${name}[^.]*\\.`, 'gi');
        const matches = notes.match(regex) || [];
        
        return matches.slice(0, 3).map(m => m.trim());
    }

    /**
     * 주요 논의 사항 추출
     */
    private extractKeyDiscussions(notes: string): string[] {
        // 간단한 구현 - 실제로는 NLP 사용
        const sentences = notes.split('.');
        const keywords = ['decided', '결정', 'agreed', '동의', 'action', '액션', 'next', '다음'];
        
        return sentences
            .filter(s => keywords.some(k => s.toLowerCase().includes(k)))
            .slice(0, 5)
            .map(s => s.trim());
    }

    /**
     * 다음 단계 식별
     */
    private identifyNextSteps(
        actionItems: ActionItem[],
        decisions: Decision[]
    ): string[] {
        const nextSteps: string[] = [];

        // 액션 아이템에서 추출
        const urgentItems = actionItems
            .filter(item => {
                const daysUntilDue = Math.ceil(
                    (new Date(item.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                return daysUntilDue <= 7;
            })
            .map(item => `${item.assignee}: ${item.title} (${item.dueDate.toLocaleDateString()})`);

        nextSteps.push(...urgentItems);

        // 결정 사항에서 추출
        decisions.forEach(decision => {
            if (decision.implementationDate) {
                nextSteps.push(`구현: ${decision.decision} (${decision.implementationDate.toLocaleDateString()})`);
            }
        });

        return nextSteps.slice(0, 5);
    }

    /**
     * 후속 회의 제안
     */
    private suggestFollowUp(
        event: CalendarEvent,
        actionItems: ActionItem[]
    ): { suggestedDate: Date; topics: string[] } | undefined {
        if (actionItems.length === 0) {
            return undefined;
        }

        // 가장 늦은 액션 아이템 마감일 찾기
        const latestDueDate = actionItems.reduce((latest, item) => {
            const dueDate = new Date(item.dueDate);
            return dueDate > latest ? dueDate : latest;
        }, new Date());

        // 마감일 이후 3-5일 후 제안
        const followUpDate = new Date(latestDueDate);
        followUpDate.setDate(followUpDate.getDate() + 4);

        return {
            suggestedDate: followUpDate,
            topics: [
                '액션 아이템 진행 상황 검토',
                '블로커 논의',
                '다음 단계 계획'
            ]
        };
    }

    /**
     * 회의 시간 계산
     */
    private calculateDuration(event: CalendarEvent): number {
        if (!event.start?.dateTime || !event.end?.dateTime) {
            return 60; // 기본값
        }

        const start = new Date(event.start.dateTime);
        const end = new Date(event.end.dateTime);
        return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    }

    /**
     * 아젠다 포맷팅
     */
    private formatAgenda(agenda: MeetingAgenda): string {
        let formatted = `# ${agenda.title}\n\n`;
        
        formatted += '## 목표\n';
        agenda.objectives.forEach(obj => {
            formatted += `- ${obj}\n`;
        });

        formatted += '\n## 주요 논의 주제\n';
        agenda.topics.forEach(topic => {
            formatted += `### ${topic.title} (${topic.duration}분)\n`;
            formatted += `${topic.description}\n`;
            if (topic.presenter) {
                formatted += `발표자: ${topic.presenter}\n`;
            }
            formatted += '\n';
        });

        formatted += '## 준비 사항\n';
        agenda.preparationItems.forEach(item => {
            formatted += `- ${item}\n`;
        });

        formatted += '\n## 예상 결과물\n';
        agenda.expectedOutcomes.forEach(outcome => {
            formatted += `- ${outcome}\n`;
        });

        return formatted;
    }

    /**
     * 회의 요약 포맷팅
     */
    private formatMeetingSummary(summary: MeetingSummary): string {
        let formatted = `# ${summary.title} 요약\n`;
        formatted += `날짜: ${summary.date.toLocaleDateString()}\n`;
        formatted += `시간: ${summary.duration}분\n\n`;

        formatted += '## 주요 논의 사항\n';
        summary.keyDiscussions.forEach(discussion => {
            formatted += `- ${discussion}\n`;
        });

        formatted += '\n## 결정 사항\n';
        summary.decisions.forEach(decision => {
            formatted += `- ${decision.topic}: ${decision.decision}\n`;
        });

        formatted += '\n## 액션 아이템\n';
        summary.actionItems.forEach(item => {
            formatted += `- [ ] ${item.title} (@${item.assignee}, ~${item.dueDate.toLocaleDateString()})\n`;
        });

        formatted += '\n## 다음 단계\n';
        summary.nextSteps.forEach(step => {
            formatted += `- ${step}\n`;
        });

        return formatted;
    }
}

// 싱글톤 인스턴스
export const meetingPreparationService = new MeetingPreparationService();