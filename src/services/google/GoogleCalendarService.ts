import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import type { CalendarEvent } from '@/types';

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: calendar_v3.Calendar;

  constructor(accessToken?: string, refreshToken?: string) {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    if (accessToken) {
      this.oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  // 캘린더 목록 가져오기
  async listCalendars(): Promise<calendar_v3.Schema$CalendarListEntry[]> {
    try {
      const response = await this.calendar.calendarList.list();
      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching calendars:', error);
      throw error;
    }
  }

  // 이벤트 목록 가져오기
  async listEvents(
    calendarId: string = 'primary',
    timeMin?: Date,
    timeMax?: Date,
    maxResults: number = 100
  ): Promise<CalendarEvent[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: timeMin?.toISOString(),
        timeMax: timeMax?.toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return (response.data.items || []).map(this.convertToCalendarEvent);
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  }

  // 단일 이벤트 가져오기
  async getEvent(eventId: string, calendarId: string = 'primary'): Promise<CalendarEvent | null> {
    try {
      const response = await this.calendar.events.get({
        calendarId,
        eventId,
      });

      return response.data ? this.convertToCalendarEvent(response.data) : null;
    } catch (error) {
      console.error('Error fetching event:', error);
      return null;
    }
  }

  // 이벤트 생성
  async createEvent(
    event: Partial<CalendarEvent>,
    calendarId: string = 'primary'
  ): Promise<CalendarEvent> {
    try {
      const googleEvent = this.convertToGoogleEvent(event);
      
      const response = await this.calendar.events.insert({
        calendarId,
        requestBody: googleEvent,
      });

      return this.convertToCalendarEvent(response.data);
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  // 이벤트 업데이트
  async updateEvent(
    eventId: string,
    updates: Partial<CalendarEvent>,
    calendarId: string = 'primary'
  ): Promise<CalendarEvent> {
    try {
      const existingEvent = await this.getEvent(eventId, calendarId);
      if (!existingEvent) {
        throw new Error('Event not found');
      }

      const mergedEvent = { ...existingEvent, ...updates };
      const googleEvent = this.convertToGoogleEvent(mergedEvent);

      const response = await this.calendar.events.update({
        calendarId,
        eventId,
        requestBody: googleEvent,
      });

      return this.convertToCalendarEvent(response.data);
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  // 이벤트 삭제
  async deleteEvent(eventId: string, calendarId: string = 'primary'): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId,
        eventId,
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  // Quick Add - 자연어로 이벤트 생성
  async quickAdd(text: string, calendarId: string = 'primary'): Promise<CalendarEvent> {
    try {
      const response = await this.calendar.events.quickAdd({
        calendarId,
        text,
      });

      return this.convertToCalendarEvent(response.data);
    } catch (error) {
      console.error('Error with quick add:', error);
      throw error;
    }
  }

  // 빈 시간 찾기 (Free/Busy 조회)
  async findFreeBusy(
    timeMin: Date,
    timeMax: Date,
    calendars: string[] = ['primary']
  ): Promise<any> {
    try {
      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          items: calendars.map(id => ({ id })),
        },
      });

      return response.data.calendars;
    } catch (error) {
      console.error('Error finding free/busy times:', error);
      throw error;
    }
  }

  // Watch for changes (실시간 동기화용)
  async watchEvents(calendarId: string = 'primary', webhookUrl: string): Promise<any> {
    try {
      const response = await this.calendar.events.watch({
        calendarId,
        requestBody: {
          id: `watch-${Date.now()}`,
          type: 'web_hook',
          address: webhookUrl,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error setting up watch:', error);
      throw error;
    }
  }

  // Google Event를 CalendarEvent로 변환
  private convertToCalendarEvent(googleEvent: calendar_v3.Schema$Event): CalendarEvent {
    return {
      id: googleEvent.id ?? undefined,
      summary: googleEvent.summary || '',
      description: googleEvent.description ?? undefined,
      location: googleEvent.location ?? undefined,
      start: googleEvent.start ? {
        dateTime: googleEvent.start.dateTime ?? googleEvent.start.date ?? undefined,
        date: googleEvent.start.date ?? undefined,
        timeZone: googleEvent.start.timeZone ?? undefined,
      } : undefined,
      end: googleEvent.end ? {
        dateTime: googleEvent.end.dateTime ?? googleEvent.end.date ?? undefined,
        date: googleEvent.end.date ?? undefined,
        timeZone: googleEvent.end.timeZone ?? undefined,
      } : undefined,
      attendees: googleEvent.attendees?.map(attendee => ({
        email: attendee.email || '',
        displayName: attendee.displayName ?? undefined,
        responseStatus: attendee.responseStatus as 'needsAction' | 'declined' | 'tentative' | 'accepted' | undefined,
        optional: attendee.optional ?? undefined,
      })),
      reminders: googleEvent.reminders ? {
        useDefault: googleEvent.reminders.useDefault ?? false,
        overrides: googleEvent.reminders.overrides?.map(reminder => ({
          method: (reminder.method ?? 'popup') as 'email' | 'popup' | 'sms',
          minutes: reminder.minutes ?? 0
        }))
      } : undefined,
      recurrence: googleEvent.recurrence ?? undefined,
      colorId: googleEvent.colorId ?? undefined,
      status: (googleEvent.status ?? undefined) as 'confirmed' | 'tentative' | 'cancelled' | undefined,
      created: googleEvent.created ?? undefined,
      updated: googleEvent.updated ?? undefined,
      creator: googleEvent.creator ? {
        email: googleEvent.creator.email ?? '',
        displayName: googleEvent.creator.displayName ?? undefined,
      } : undefined,
      organizer: googleEvent.organizer ? {
        email: googleEvent.organizer.email ?? '',
        displayName: googleEvent.organizer.displayName ?? undefined,
      } : undefined,
    };
  }

  // CalendarEvent를 Google Event로 변환
  private convertToGoogleEvent(event: Partial<CalendarEvent>): calendar_v3.Schema$Event {
    const googleEvent: calendar_v3.Schema$Event = {
      summary: event.summary,
      description: event.description,
      location: event.location,
      colorId: event.colorId,
    };

    if (event.start) {
      googleEvent.start = {
        dateTime: event.start.dateTime,
        timeZone: event.start.timeZone || 'Asia/Seoul',
      };
    }

    if (event.end) {
      googleEvent.end = {
        dateTime: event.end.dateTime,
        timeZone: event.end.timeZone || 'Asia/Seoul',
      };
    }

    if (event.attendees) {
      googleEvent.attendees = event.attendees.map(attendee => ({
        email: attendee.email,
        displayName: attendee.displayName,
        responseStatus: attendee.responseStatus,
        optional: attendee.optional,
      }));
    }

    if (event.reminders) {
      googleEvent.reminders = event.reminders;
    }

    if (event.recurrence) {
      googleEvent.recurrence = event.recurrence;
    }

    return googleEvent;
  }

  // 토큰 갱신
  async refreshAccessToken(): Promise<any> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);
      return credentials;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw error;
    }
  }
}