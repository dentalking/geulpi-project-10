// TeamScheduler 관련 타입 정의

export interface TeamMember {
  email: string;
  name: string;
  timeZone: string;
  priority: number;
  availability?: TimeSlot[];
}

export interface TeamSchedulingRequest {
  title: string;
  duration: number;
  members: TeamMember[];
  preferredTimeRanges?: TimeRange[];
  mustHaveMembers?: string[];
  optionalMembers?: string[];
  deadline?: Date;
}

export interface TeamProductivityPattern {
  teamId: string;
  bestMeetingTimes: string[];
  averageMeetingDuration: number;
  productivityPeaks: Array<{
    dayOfWeek: number;
    hour: number;
    score: number;
  }>;
  collaborationIndex: number;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  recurring?: boolean;
  daysOfWeek?: number[];
}

export interface TimeRange {
  start: Date;
  end: Date;
}

// Storage 관련 타입
export interface DeletionRecord {
  id: string;
  deletedAt: Date;
  originalData?: any;
}