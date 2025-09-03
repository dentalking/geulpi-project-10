// AI 서비스 모듈 내보내기

export { GeminiService, geminiService } from './GeminiService';
export { ContextManager, contextManager } from './ContextManager';
export { AIRouter, aiRouter } from './AIRouter';
export { PatternLearner, patternLearner } from './PatternLearner';
export { MeetingPreparationService, meetingPreparationService } from './MeetingPreparation';
export type {
    MeetingPreparationConfig,
    MeetingAgenda,
    AgendaTopic,
    MeetingMaterials,
    Document,
    Reference,
    ActionItem,
    MeetingSummary,
    AttendeeParticipation,
    Decision
} from './MeetingPreparation';