import { calendar_v3 } from 'googleapis';
import { CalendarEvent, Attendee, User } from '@/types';

type Schema$Event = calendar_v3.Schema$Event;
type Schema$EventAttendee = calendar_v3.Schema$EventAttendee;

/**
 * Google Calendar API Event를 내부 CalendarEvent 타입으로 변환
 * null 값을 undefined로 안전하게 변환
 */
export function convertGoogleEventToCalendarEvent(googleEvent: Schema$Event): CalendarEvent {
  const event: CalendarEvent = {
    summary: googleEvent.summary || 'Untitled Event',
  };

  // Optional fields - null을 undefined로 변환
  if (googleEvent.id !== null && googleEvent.id !== undefined) {
    event.id = googleEvent.id;
  }

  if (googleEvent.description !== null && googleEvent.description !== undefined) {
    event.description = googleEvent.description;
  }

  if (googleEvent.location !== null && googleEvent.location !== undefined) {
    event.location = googleEvent.location;
  }

  // Start and End times
  if (googleEvent.start) {
    event.start = {
      dateTime: googleEvent.start.dateTime ?? undefined,
      date: googleEvent.start.date ?? undefined,
      timeZone: googleEvent.start.timeZone ?? undefined,
    };
  }

  if (googleEvent.end) {
    event.end = {
      dateTime: googleEvent.end.dateTime ?? undefined,
      date: googleEvent.end.date ?? undefined,
      timeZone: googleEvent.end.timeZone ?? undefined,
    };
  }

  // Attendees
  if (googleEvent.attendees && googleEvent.attendees.length > 0) {
    event.attendees = googleEvent.attendees
      .filter((att): att is Schema$EventAttendee => att !== null && att !== undefined)
      .map(convertGoogleAttendeeToAttendee);
  }

  // Reminders
  if (googleEvent.reminders && googleEvent.reminders !== null) {
    event.reminders = {
      useDefault: googleEvent.reminders.useDefault ?? false,
      overrides: googleEvent.reminders.overrides
        ?.filter(o => o.method && o.minutes !== null && o.minutes !== undefined)
        .map(o => ({
          method: o.method as 'email' | 'popup' | 'sms',
          minutes: o.minutes!
        }))
    };
  }

  // Recurrence
  if (googleEvent.recurrence !== null && googleEvent.recurrence !== undefined) {
    event.recurrence = googleEvent.recurrence;
  }

  // Status
  if (googleEvent.status !== null && googleEvent.status !== undefined) {
    const validStatuses = ['confirmed', 'tentative', 'cancelled'];
    if (validStatuses.includes(googleEvent.status)) {
      event.status = googleEvent.status as 'confirmed' | 'tentative' | 'cancelled';
    }
  }

  // Color
  if (googleEvent.colorId !== null && googleEvent.colorId !== undefined) {
    event.colorId = googleEvent.colorId;
  }

  // Conference Data
  if (googleEvent.conferenceData) {
    event.conferenceData = {
      entryPoints: googleEvent.conferenceData.entryPoints
        ?.filter(ep => ep.entryPointType)
        .map(ep => ({
          entryPointType: ep.entryPointType as 'video' | 'phone' | 'sip' | 'more',
          uri: ep.uri ?? undefined,
          label: ep.label ?? undefined,
          pin: ep.pin ?? undefined
        })),
      conferenceSolution: googleEvent.conferenceData.conferenceSolution ? {
        key: {
          type: googleEvent.conferenceData.conferenceSolution.key?.type || ''
        },
        name: googleEvent.conferenceData.conferenceSolution.name || '',
        iconUri: googleEvent.conferenceData.conferenceSolution.iconUri ?? undefined
      } : undefined
    };
  }

  // Timestamps
  if (googleEvent.created !== null && googleEvent.created !== undefined) {
    event.created = googleEvent.created;
  }

  if (googleEvent.updated !== null && googleEvent.updated !== undefined) {
    event.updated = googleEvent.updated;
  }

  // Creator and Organizer
  if (googleEvent.creator) {
    event.creator = convertGoogleUserToUser(googleEvent.creator);
  }

  if (googleEvent.organizer) {
    event.organizer = convertGoogleUserToUser(googleEvent.organizer);
  }

  return event;
}

/**
 * Google Calendar Attendee를 내부 Attendee 타입으로 변환
 */
function convertGoogleAttendeeToAttendee(googleAttendee: Schema$EventAttendee): Attendee {
  return {
    email: googleAttendee.email || '',
    displayName: googleAttendee.displayName ?? undefined,
    responseStatus: (googleAttendee.responseStatus ?? 'needsAction') as 
      'needsAction' | 'declined' | 'tentative' | 'accepted',
    optional: googleAttendee.optional ?? false,
    resource: googleAttendee.resource ?? false,
    comment: googleAttendee.comment ?? undefined
  };
}

/**
 * Google Calendar User를 내부 User 타입으로 변환
 */
function convertGoogleUserToUser(googleUser: any): User | undefined {
  if (!googleUser || !googleUser.email) {
    return undefined;
  }

  return {
    email: googleUser.email,
    displayName: googleUser.displayName ?? undefined,
    id: googleUser.id ?? undefined,
    self: googleUser.self ?? undefined
  };
}

/**
 * CalendarEvent를 Google Calendar API Event로 변환
 */
export function convertCalendarEventToGoogleEvent(event: CalendarEvent): Schema$Event {
  const googleEvent: Schema$Event = {
    summary: event.summary,
    description: event.description || undefined,
    location: event.location || undefined,
    start: event.start ? {
      dateTime: event.start.dateTime || undefined,
      date: event.start.date || undefined,
      timeZone: event.start.timeZone || undefined
    } : undefined,
    end: event.end ? {
      dateTime: event.end.dateTime || undefined,
      date: event.end.date || undefined,
      timeZone: event.end.timeZone || undefined
    } : undefined,
    attendees: event.attendees?.map(att => ({
      email: att.email,
      displayName: att.displayName || undefined,
      responseStatus: att.responseStatus || undefined,
      optional: att.optional || undefined,
      resource: att.resource || undefined,
      comment: att.comment || undefined
    })) || undefined,
    reminders: event.reminders ? {
      useDefault: event.reminders.useDefault,
      overrides: event.reminders.overrides?.map(o => ({
        method: o.method,
        minutes: o.minutes
      })) || undefined
    } : undefined,
    recurrence: event.recurrence || undefined,
    status: event.status || undefined,
    colorId: event.colorId || undefined,
    conferenceData: event.conferenceData ? {
      entryPoints: event.conferenceData.entryPoints?.map(ep => ({
        entryPointType: ep.entryPointType,
        uri: ep.uri || undefined,
        label: ep.label || undefined,
        pin: ep.pin || undefined
      })) || undefined,
      conferenceSolution: event.conferenceData.conferenceSolution ? {
        key: {
          type: event.conferenceData.conferenceSolution.key.type
        },
        name: event.conferenceData.conferenceSolution.name,
        iconUri: event.conferenceData.conferenceSolution.iconUri || undefined
      } : undefined
    } : undefined
  };

  // ID는 수정 시에만 포함
  if (event.id) {
    googleEvent.id = event.id;
  }

  return googleEvent;
}

/**
 * Google Calendar Event 배열을 안전하게 변환
 */
export function convertGoogleEventsToCalendarEvents(
  googleEvents: Schema$Event[] | undefined | null
): CalendarEvent[] {
  if (!googleEvents) return [];
  
  return googleEvents
    .filter((event): event is Schema$Event => event !== null && event !== undefined)
    .map(convertGoogleEventToCalendarEvent);
}