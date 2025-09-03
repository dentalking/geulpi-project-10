import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { ProactiveNotification, NotificationAction } from '@/types';
import { NotificationScheduler } from '@/services/notification';

interface NotificationState {
  notifications: ProactiveNotification[];
  unreadCount: number;
  isInitialized: boolean;
  scheduler: NotificationScheduler | null;
  
  // Actions
  initialize: (userId: string) => Promise<void>;
  addNotification: (notification: ProactiveNotification) => void;
  removeNotification: (notificationId: string) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  handleAction: (notificationId: string, action: NotificationAction) => Promise<void>;
  clearNotifications: () => void;
  updateNotification: (notificationId: string, updates: Partial<ProactiveNotification>) => void;
  getNotificationById: (notificationId: string) => ProactiveNotification | undefined;
  getNotificationsByType: (type: string) => ProactiveNotification[];
  getHighPriorityNotifications: () => ProactiveNotification[];
  cleanup: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  immer((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isInitialized: false,
    scheduler: null,

    initialize: async (userId: string) => {
      set((state) => {
        if (!state.scheduler) {
          state.scheduler = new NotificationScheduler();
        }
        state.isInitialized = true;
      });

      const scheduler = get().scheduler;
      if (scheduler) {
        await scheduler.initialize(userId);
        
        // 초기 알림 체크
        await scheduler.checkAndScheduleNotifications(userId);
      }
    },

    addNotification: (notification: ProactiveNotification) => {
      set((state) => {
        // 중복 확인
        const exists = state.notifications.some(n => n.id === notification.id);
        if (!exists) {
          state.notifications.unshift(notification);
          state.unreadCount += 1;
          
          // 우선순위에 따른 정렬
          state.notifications.sort((a, b) => {
            const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          });
        }
      });
    },

    removeNotification: (notificationId: string) => {
      set((state) => {
        const index = state.notifications.findIndex(n => n.id === notificationId);
        if (index !== -1) {
          const notification = state.notifications[index];
          if (!notification.metadata?.read) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
          state.notifications.splice(index, 1);
        }
      });
    },

    markAsRead: (notificationId: string) => {
      set((state) => {
        const notification = state.notifications.find(n => n.id === notificationId);
        if (notification && !notification.metadata?.read) {
          notification.metadata = {
            ...notification.metadata,
            read: true,
            readAt: new Date()
          };
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      });
    },

    markAllAsRead: () => {
      set((state) => {
        state.notifications.forEach(notification => {
          if (!notification.metadata?.read) {
            notification.metadata = {
              ...notification.metadata,
              read: true,
              readAt: new Date()
            };
          }
        });
        state.unreadCount = 0;
      });
    },

    handleAction: async (notificationId: string, action: NotificationAction) => {
      const notification = get().notifications.find(n => n.id === notificationId);
      if (!notification) return;

      // 액션 타입별 처리
      const [actionType, ...params] = action.action.split(':');

      switch (actionType) {
        case 'view-event':
          // 이벤트 상세 보기
          window.location.href = `/calendar/event/${params[0]}`;
          break;
          
        case 'navigate':
          // 길찾기 (Google Maps 연동)
          const location = params.join(':');
          window.open(`https://maps.google.com/maps?q=${encodeURIComponent(location)}`, '_blank');
          break;
          
        case 'prepare-meeting':
          // 회의 준비 페이지로 이동
          window.location.href = `/meeting/prepare/${params[0]}`;
          break;
          
        case 'show-checklist':
          // 체크리스트 표시
          console.log('Show checklist for event:', params[0]);
          break;
          
        case 'view-today-events':
          // 오늘 일정 보기
          window.location.href = '/calendar/today';
          break;
          
        case 'play-briefing':
          // 브리핑 재생
          console.log('Play daily briefing');
          break;
          
        case 'resolve-conflict':
          // 일정 충돌 해결
          window.location.href = `/calendar/conflict/${params[0]}/${params[1]}`;
          break;
          
        case 'reschedule':
          // 일정 재조정
          window.location.href = `/calendar/reschedule/${params[0]}`;
          break;
          
        case 'snooze':
          // 알림 미루기
          const minutes = parseInt(params[0] || '10');
          set((state) => {
            const notif = state.notifications.find(n => n.id === notificationId);
            if (notif && notif.scheduledFor) {
              notif.scheduledFor = new Date(
                new Date(notif.scheduledFor).getTime() + minutes * 60 * 1000
              );
            }
          });
          break;
          
        case 'dismiss':
          // 알림 닫기
          get().removeNotification(notificationId);
          break;
          
        default:
          console.log('Unknown action:', action.action);
      }

      // 알림을 읽음으로 표시
      get().markAsRead(notificationId);
    },

    clearNotifications: () => {
      set((state) => {
        state.notifications = [];
        state.unreadCount = 0;
      });
    },

    updateNotification: (notificationId: string, updates: Partial<ProactiveNotification>) => {
      set((state) => {
        const notification = state.notifications.find(n => n.id === notificationId);
        if (notification) {
          Object.assign(notification, updates);
        }
      });
    },

    getNotificationById: (notificationId: string) => {
      return get().notifications.find(n => n.id === notificationId);
    },

    getNotificationsByType: (type: string) => {
      return get().notifications.filter(n => n.type === type);
    },

    getHighPriorityNotifications: () => {
      return get().notifications.filter(n => 
        n.priority === 'urgent' || n.priority === 'high'
      );
    },

    cleanup: () => {
      const scheduler = get().scheduler;
      if (scheduler) {
        scheduler.stop();
      }
      
      set((state) => {
        state.notifications = [];
        state.unreadCount = 0;
        state.isInitialized = false;
        state.scheduler = null;
      });
    }
  }))
);

// Socket.io 이벤트 리스너 설정
if (typeof window !== 'undefined') {
  const socket = (window as any).socket;
  if (socket) {
    socket.on('notification', (notification: ProactiveNotification) => {
      useNotificationStore.getState().addNotification(notification);
    });
  }
}

export default useNotificationStore;