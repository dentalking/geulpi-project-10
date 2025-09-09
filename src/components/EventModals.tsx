'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Bell, 
  FileText,
  Edit,
  Trash2,
  Share,
  ChevronLeft,
  Plus
} from 'lucide-react';
import type { CalendarEvent } from '@/types';

interface EventListModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onAddEvent: () => void;
  locale: string;
}

interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
  locale: string;
}

interface EventCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onCreate: (eventData: any) => void;
  locale: string;
}

// Event List Modal
export function EventListModal({
  isOpen,
  onClose,
  selectedDate,
  events = [],
  onEventClick,
  onAddEvent,
  locale
}: EventListModalProps) {
  const dayEvents = (events || []).filter(event => {
    const eventDate = new Date(event.start?.dateTime || event.start?.date || '');
    return eventDate.toDateString() === selectedDate.toDateString();
  });

  const formatTime = (dateTime: string | undefined) => {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return date.toLocaleTimeString(locale === 'ko' ? 'ko-KR' : 'en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50"
          />
          
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 rounded-t-3xl"
            style={{ maxHeight: '85vh' }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-gray-900 rounded-t-3xl p-5 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-3xl font-bold text-white">
                    {selectedDate.getDate()}
                  </h2>
                  <span className="text-gray-400">
                    {selectedDate.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', { 
                      weekday: 'long'
                    })}
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-gray-800"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              {/* Event Count */}
              <div className="mt-3 text-gray-500 text-sm">
                {dayEvents.length > 0 
                  ? `${locale === 'ko' ? '일정' : 'Events'} ${dayEvents.length}${locale === 'ko' ? '개' : ''}`
                  : locale === 'ko' ? '일정 없음' : 'No events'
                }
              </div>
            </div>

            {/* Event List */}
            <div className="px-5 pb-5 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 120px)' }}>
              {dayEvents.length > 0 ? (
                <div className="space-y-3">
                  {dayEvents.map((event, index) => (
                    <button
                      key={index}
                      onClick={() => onEventClick(event)}
                      className="w-full text-left"
                    >
                      <div className="bg-gray-800 rounded-2xl p-4 hover:bg-gray-750 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-purple-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white font-medium">
                              {event.summary || '제목 없음'}
                            </h3>
                            {event.start?.dateTime && (
                              <p className="text-gray-400 text-sm mt-0.5">
                                {formatTime(event.start.dateTime)}
                              </p>
                            )}
                          </div>
                          <div className="w-5 h-5 rounded-full bg-green-500 animate-pulse" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                    <Calendar className="w-10 h-10 text-gray-600" />
                  </div>
                  <p className="text-gray-400 mb-6">
                    {locale === 'ko' ? '일정이 없습니다' : 'No events'}
                  </p>
                  <button
                    onClick={onAddEvent}
                    className="px-6 py-3 bg-purple-500 text-white rounded-xl flex items-center gap-2 hover:bg-purple-600 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    {locale === 'ko' ? '일정 추가' : 'Add Event'}
                  </button>
                </div>
              )}
            </div>

            {/* Add Event Button */}
            {dayEvents.length > 0 && (
              <div className="sticky bottom-0 p-5 bg-gradient-to-t from-gray-900">
                <button
                  onClick={onAddEvent}
                  className="w-full py-4 bg-purple-500 text-white rounded-2xl flex items-center justify-center gap-2 hover:bg-purple-600 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  {locale === 'ko' ? '일정 추가' : 'Add Event'}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Event Detail Modal
export function EventDetailModal({
  isOpen,
  onClose,
  event,
  onEdit,
  onDelete,
  locale
}: EventDetailModalProps) {
  if (!event) return null;

  const formatDateTime = (dateTime: string | undefined) => {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return date.toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US', {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <AnimatePresence>
      {isOpen && event && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-gray-900 rounded-3xl max-h-[80vh] overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <button
                  onClick={onClose}
                  className="p-2 -ml-2 rounded-lg hover:bg-gray-800"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                </button>
                <h3 className="text-lg font-medium text-white">
                  {event.summary || '제목 없음'}
                </h3>
                <div className="w-5 h-5 rounded-full bg-purple-500" />
              </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 200px)' }}>
              {/* Date & Time */}
              <div className="flex items-start gap-4">
                <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-white">
                    {formatDateTime(event.start?.dateTime || event.start?.date)}
                  </p>
                  {event.end?.dateTime && (
                    <p className="text-gray-400 text-sm mt-1">
                      → {formatDateTime(event.end.dateTime)}
                    </p>
                  )}
                </div>
              </div>

              {/* Location */}
              {event.location && (
                <div className="flex items-start gap-4">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <p className="text-white">{event.location}</p>
                </div>
              )}

              {/* Attendees */}
              {event.attendees && event.attendees.length > 0 && (
                <div className="flex items-start gap-4">
                  <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-400 text-sm mb-2">
                      {locale === 'ko' ? '참석자' : 'Attendees'}
                    </p>
                    {event.attendees.map((attendee, index) => (
                      <p key={index} className="text-white">
                        {attendee.email}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Reminder */}
              <div className="flex items-start gap-4">
                <Bell className="w-5 h-5 text-gray-400 mt-0.5" />
                <p className="text-white">
                  {locale === 'ko' ? '10분 전' : '10 minutes before'}
                </p>
              </div>

              {/* Description */}
              {event.description && (
                <div className="flex items-start gap-4">
                  <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-400 text-sm mb-2">
                      {locale === 'ko' ? '메모' : 'Notes'}
                    </p>
                    <p className="text-white">{event.description}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-5 border-t border-gray-800 flex gap-3">
              <button
                onClick={() => onEdit(event)}
                className="flex-1 py-3 bg-gray-800 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-gray-700"
              >
                <Edit className="w-4 h-4" />
                {locale === 'ko' ? '편집' : 'Edit'}
              </button>
              <button
                onClick={() => onDelete(event)}
                className="flex-1 py-3 bg-gray-800 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-gray-700"
              >
                <Trash2 className="w-4 h-4" />
                {locale === 'ko' ? '삭제' : 'Delete'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Event Create Modal
export function EventCreateModal({
  isOpen,
  onClose,
  selectedDate,
  onCreate,
  locale
}: EventCreateModalProps) {
  const [title, setTitle] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!title || isCreating) return;

    setIsCreating(true);
    
    // Format date in local timezone (YYYY-MM-DD)
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const localDateString = `${year}-${month}-${day}`;
    
    const eventData = {
      title,
      date: localDateString,
      allDay,
      time: allDay ? null : startTime,
      endTime: allDay ? null : endTime,
      location,
      description
    };

    await onCreate(eventData);
    
    // Reset form
    setTitle('');
    setAllDay(false);
    setStartTime('09:00');
    setEndTime('10:00');
    setLocation('');
    setDescription('');
    setIsCreating(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50"
          />
          
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 rounded-t-3xl"
            style={{ maxHeight: '90vh' }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-gray-900 rounded-t-3xl p-5 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">
                  {locale === 'ko' ? '새 일정' : 'New Event'}
                </h3>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-gray-800"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-5 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              {/* Title */}
              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={locale === 'ko' ? '제목' : 'Title'}
                  className="w-full px-4 py-3 bg-gray-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* All Day Toggle */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-800 rounded-xl">
                <span className="text-white">
                  {locale === 'ko' ? '하루 종일' : 'All day'}
                </span>
                <button
                  onClick={() => setAllDay(!allDay)}
                  className={`w-12 h-6 rounded-full transition-all ${
                    allDay ? 'bg-purple-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-all ${
                    allDay ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Time Selection */}
              {!allDay && (
                <div className="space-y-3">
                  <div className="bg-gray-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">
                        {selectedDate.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short'
                        })}
                      </span>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="bg-transparent text-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">
                        {selectedDate.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short'
                        })}
                      </span>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="bg-transparent text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Location */}
              <div>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={locale === 'ko' ? '장소' : 'Location'}
                  className="w-full px-4 py-3 bg-gray-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Description */}
              <div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={locale === 'ko' ? '메모' : 'Notes'}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 p-5 bg-gray-900 border-t border-gray-800 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700"
              >
                {locale === 'ko' ? '취소' : 'Cancel'}
              </button>
              <button
                onClick={handleCreate}
                disabled={!title || isCreating}
                className="flex-1 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isCreating ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {locale === 'ko' ? '생성 중...' : 'Creating...'}
                  </div>
                ) : (
                  locale === 'ko' ? '저장' : 'Save'
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}