// types/index.ts

// Re-export calendar types
export * from './calendar';

// ============= Calendar Types =============
export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  placeDetails?: {
    name: string;
    address: string;
    placeId: string;
    location: { lat: number; lng: number };
    details?: any;
  };
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Attendee[];
  reminders?: EventReminder;
  recurrence?: string[];
  status?: 'confirmed' | 'tentative' | 'cancelled';
  colorId?: string;
  conferenceData?: ConferenceData;
  created?: string;
  updated?: string;
  creator?: User;
  organizer?: User;
  // Event sharing properties
  shared_with?: string[];
  share_permission?: 'view' | 'edit' | 'owner';
  // Event categorization
  categories?: string[];
  tags?: string[];
}

export interface Attendee {
  email: string;
  displayName?: string;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  optional?: boolean;
  resource?: boolean;
  comment?: string;
}

export interface EventReminder {
  useDefault: boolean;
  overrides?: Array<{
    method: 'email' | 'popup' | 'sms';
    minutes: number;
  }>;
}

export interface ConferenceData {
  entryPoints?: Array<{
    entryPointType: 'video' | 'phone' | 'sip' | 'more';
    uri?: string;
    label?: string;
    pin?: string;
  }>;
  conferenceSolution?: {
    key: {
      type: string;
    };
    name: string;
    iconUri?: string;
  };
}

export interface User {
  email: string;
  displayName?: string;
  id?: string;
  self?: boolean;
}

// ============= AI & Context Types =============
export interface UserContext {
  userId: string;
  currentTime: Date;
  timeZone: string;
  preferences: UserPreferences;
  recentEvents: CalendarEvent[];
  patterns: UserPattern;
  lastUpdated?: Date;
}

export interface UserPreferences {
  workingHours: {
    start: number;
    end: number;
  };
  briefingTime: string;
  language: 'ko' | 'en';
  defaultDuration: number;
  reminderMinutes: number;
  preferredMeetingDays?: string[];
  blockedTimeSlots?: TimeSlot[];
}

export interface UserPattern {
  frequentLocations: string[];
  commonMeetingTimes: string[];
  regularAttendees: string[];
  preferredDurations: Map<string, number>;
  eventTypePatterns: Map<string, EventPattern>;
  weeklyPattern?: WeeklyPattern;
  // Additional computed properties for AI suggestions
  mostFrequentTime?: string;
  mostFrequentLocation?: string;
  averageEventDuration?: number;
}

export interface EventPattern {
  averageDuration: number;
  commonLocations: string[];
  commonAttendees: string[];
  preferredTimes: string[];
}

export interface WeeklyPattern {
  busyDays: string[];
  quietDays: string[];
  meetingDensity: Map<string, number>;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  recurring?: boolean;
  daysOfWeek?: number[];
}

// ============= AI Intent & Response Types =============
export interface AIIntent {
  type: IntentType;
  confidence: number;
  parameters: Record<string, any>;
  entities?: Entity[];
  context?: string;
}

export type IntentType = 
  | 'CREATE_EVENT' 
  | 'SEARCH_EVENTS' 
  | 'GET_BRIEFING' 
  | 'UPDATE_EVENT' 
  | 'DELETE_EVENT' 
  | 'BATCH_OPERATION' 
  | 'CONVERSATION'
  | 'SCHEDULE_SUGGESTION'
  | 'CONFLICT_RESOLUTION'
  | 'PATTERN_ANALYSIS';

export interface Entity {
  type: 'date' | 'time' | 'duration' | 'location' | 'person' | 'event_type';
  value: string;
  normalized?: any;
  confidence?: number;
}

export interface AIResponse {
  type: ResponseType;
  message: string;
  action?: string;
  data?: any;
  error?: string;
  suggestions?: SmartSuggestion[];
  metadata?: ResponseMetadata;
}

export type ResponseType = 
  | 'text' 
  | 'action' 
  | 'data' 
  | 'error' 
  | 'clarification' 
  | 'confirmation';

export interface ResponseMetadata {
  processingTime?: number;
  confidence?: number;
  source?: string;
  relatedEvents?: string[];
}

// ============= Message & Chat Types =============
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type: MessageType;
  data?: any;
  metadata?: MessageMetadata;
}

export type MessageType = 
  | 'text' 
  | 'action' 
  | 'data' 
  | 'image' 
  | 'voice' 
  | 'suggestion'
  | 'error';

export interface MessageMetadata {
  edited?: boolean;
  editedAt?: Date;
  reactions?: string[];
  threadId?: string;
  inReplyTo?: string;
  source?: string;
}

export interface ConversationHistory {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: any;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: AIMessage[];
  userId?: string;
  isActive?: boolean;
  metadata?: {
    totalMessages?: number;
    lastActivity?: Date;
    tags?: string[];
  };
}

export interface SmartSuggestion {
  id: string;
  title: string;
  action: string;
  icon?: string;
  confidence?: number;
  type?: SuggestionType;
  metadata?: any;
}

export type SuggestionType = 
  | 'quick_action' 
  | 'follow_up' 
  | 'clarification' 
  | 'alternative'
  | 'template' 
  | 'warning' 
  | 'tip';

// ============= Event Data Types =============
export interface EventData {
  title: string;
  date: string;
  time: string;
  duration: number;
  location?: string;
  description?: string;
  attendees?: string[];
  recurrence?: RecurrenceRule;
  priority?: 'low' | 'medium' | 'high';
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  count?: number;
  until?: string;
  byDay?: string[];
  byMonth?: number[];
}

export interface ImageParseResult {
  title: string;
  date: string;
  time: string;
  duration: number;
  location?: string;
  description?: string;
  confidence?: number;
  extractedText?: string;
}

// ============= Scheduling Types =============
export interface SchedulingConstraint {
  mustHaveAttendees?: string[];
  optionalAttendees?: string[];
  duration: number;
  preferredTimeRanges?: TimeRange[];
  avoidTimeRanges?: TimeRange[];
  preferredLocations?: string[];
  requiresVideoConference?: boolean;
  buffer?: {
    before?: number;
    after?: number;
  };
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface SchedulingSuggestion {
  slot: TimeSlot;
  score: number;
  conflicts: ConflictInfo[];
  reasoning: string;
}

export interface ConflictInfo {
  eventId: string;
  eventTitle: string;
  conflictType: 'overlap' | 'buffer' | 'preference';
  severity: 'low' | 'medium' | 'high';
}

// ============= Pattern Learning Types =============
export interface PatternInsight {
  type: InsightType;
  pattern: string;
  confidence: number;
  frequency: number;
  suggestion?: string;
  data?: any;
}

export type InsightType = 
  | 'meeting_pattern' 
  | 'scheduling_preference' 
  | 'attendance_pattern' 
  | 'duration_pattern'
  | 'location_preference'
  | 'collaboration_pattern';

export interface LearningData {
  userId: string;
  events: CalendarEvent[];
  patterns: PatternInsight[];
  lastAnalyzed: Date;
  version: string;
}

// ============= Notification Types =============
export interface ProactiveNotification {
  id: string;
  type: NotificationType;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  actionRequired?: boolean;
  actions?: NotificationAction[];
  metadata?: any;
  scheduledFor?: Date;
  expiresAt?: Date;
}

export type NotificationType = 
  | 'reminder' 
  | 'conflict' 
  | 'suggestion' 
  | 'briefing' 
  | 'alert'
  | 'insight';

export interface NotificationAction {
  id: string;
  label: string;
  action: string;
  style?: 'primary' | 'secondary' | 'danger';
}

// ============= Error Types =============
export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  requestId?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// ============= Session Types =============
export interface SessionData {
  sessionId: string;
  userId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface AuthState {
  isAuthenticated: boolean;
  user?: User;
  session?: SessionData;
  loading?: boolean;
  error?: APIError;
}