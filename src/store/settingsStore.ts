/**
 * 채팅 기반 설정 제어를 위한 글로벌 상태 관리
 * Zustand를 사용한 실시간 설정 동기화
 */

import React from 'react';
import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { SettingsAction } from '@/services/ai/SettingsControlService';

export interface UserSettings {
  // UI 설정
  theme: 'light' | 'dark' | 'auto';
  language: 'ko' | 'en';
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;

  // 캘린더 설정
  calendarView: 'month' | 'week' | 'day';
  weekStartsOn: 'sunday' | 'monday';
  timeFormat: '12h' | '24h';

  // 알림 설정
  notifications: {
    enabled: boolean;
    email: boolean;
    push: boolean;
    sound: boolean;
    eventReminders: boolean;
    friendRequests: boolean;
  };

  // 개인정보 설정
  privacy: {
    showOnlineStatus: boolean;
    allowFriendRequests: boolean;
    calendarVisibility: 'private' | 'friends' | 'public';
  };

  // 접근성 설정
  accessibility: {
    highContrast: boolean;
    reduceMotion: boolean;
    screenReader: boolean;
  };
}

export interface SettingsState {
  settings: UserSettings;
  isLoading: boolean;
  lastUpdated: Date | null;
  pendingChanges: Partial<UserSettings>;

  // Actions
  updateSetting: (key: keyof UserSettings, value: any) => void;
  updateNestedSetting: (path: string, value: any) => void;
  applyChatSettings: (action: SettingsAction) => Promise<boolean>;
  resetSettings: () => void;
  saveSettings: () => Promise<boolean>;
  loadSettings: () => Promise<void>;

  // Chat-specific actions
  processChatCommand: (action: SettingsAction) => {
    success: boolean;
    message: string;
    requiresReload?: boolean;
  };
}

// 기본 설정값
const DEFAULT_SETTINGS: UserSettings = {
  theme: 'auto',
  language: 'ko',
  fontSize: 'medium',
  compactMode: false,

  calendarView: 'month',
  weekStartsOn: 'sunday',
  timeFormat: '24h',

  notifications: {
    enabled: true,
    email: true,
    push: true,
    sound: true,
    eventReminders: true,
    friendRequests: true,
  },

  privacy: {
    showOnlineStatus: true,
    allowFriendRequests: true,
    calendarVisibility: 'friends',
  },

  accessibility: {
    highContrast: false,
    reduceMotion: false,
    screenReader: false,
  },
};

export const useSettingsStore = create<SettingsState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        settings: DEFAULT_SETTINGS,
        isLoading: false,
        lastUpdated: null,
        pendingChanges: {},

        updateSetting: (key, value) => {
          set((state) => ({
            settings: {
              ...state.settings,
              [key]: value,
            },
            lastUpdated: new Date(),
          }));
        },

        updateNestedSetting: (path, value) => {
          set((state) => {
            const keys = path.split('.');
            const newSettings = { ...state.settings };
            let current: any = newSettings;

            // Navigate to the nested property
            for (let i = 0; i < keys.length - 1; i++) {
              current[keys[i]] = { ...current[keys[i]] };
              current = current[keys[i]];
            }

            // Set the final value
            current[keys[keys.length - 1]] = value;

            return {
              settings: newSettings,
              lastUpdated: new Date(),
            };
          });
        },

        /**
         * 채팅 명령어로부터 설정 적용
         */
        applyChatSettings: async (action: SettingsAction) => {
          const { type, subtype, value } = action;

          try {
            switch (type) {
              case 'theme':
                get().updateSetting('theme', value);
                // 즉시 DOM에 테마 클래스 적용
                document.documentElement.classList.remove('light', 'dark');
                if (value !== 'auto') {
                  document.documentElement.classList.add(value);
                }
                break;

              case 'language':
                get().updateSetting('language', value);
                // 언어 변경은 페이지 리로드 필요
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
                break;

              case 'notification':
                if (subtype === 'enable' || subtype === 'disable') {
                  get().updateNestedSetting('notifications.enabled', value);
                }
                break;

              case 'calendar_view':
                get().updateSetting('calendarView', value);
                // 캘린더 컴포넌트에 이벤트 발송
                window.dispatchEvent(new CustomEvent('calendarViewChanged', {
                  detail: { view: value }
                }));
                break;

              case 'ui':
                if (subtype === 'compact') {
                  get().updateSetting('compactMode', value);
                }
                break;

              default:
                console.warn('Unknown settings action:', action);
                return false;
            }

            // 서버에 설정 저장
            await get().saveSettings();
            return true;

          } catch (error) {
            console.error('Failed to apply chat settings:', error);
            return false;
          }
        },

        /**
         * 채팅 명령어 처리 (UI 피드백 포함)
         */
        processChatCommand: (action: SettingsAction) => {
          const { type, subtype, value, securityLevel } = action;

          // 보안 검사
          if (securityLevel === 'restricted') {
            return {
              success: false,
              message: "보안상 해당 설정은 직접 변경해주세요.",
            };
          }

          // 설정 적용 전 검증
          let message = "";
          let requiresReload = false;

          switch (type) {
            case 'theme':
              get().updateSetting('theme', value);
              message = `${value === 'light' ? '라이트' : value === 'dark' ? '다크' : '자동'} 모드로 변경되었습니다! ✨`;

              // 즉시 테마 적용
              if (typeof window !== 'undefined') {
                document.documentElement.classList.remove('light', 'dark');
                if (value !== 'auto') {
                  document.documentElement.classList.add(value);
                } else {
                  // 시스템 테마 감지
                  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  document.documentElement.classList.add(systemDark ? 'dark' : 'light');
                }
              }
              break;

            case 'language':
              get().updateSetting('language', value);
              message = `언어가 ${value === 'ko' ? '한국어' : '영어'}로 변경되었습니다! 🌍`;
              requiresReload = true;
              break;

            case 'notification':
              get().updateNestedSetting('notifications.enabled', value);
              message = `알림이 ${value ? '활성화' : '비활성화'}되었습니다! ${value ? '🔔' : '🔕'}`;
              break;

            case 'calendar_view':
              get().updateSetting('calendarView', value);
              message = `캘린더가 ${value === 'month' ? '월' : value === 'week' ? '주' : '일'} 보기로 변경되었습니다! 📅`;
              break;

            default:
              return {
                success: false,
                message: "죄송합니다. 해당 설정은 아직 지원되지 않습니다.",
              };
          }

          // 비동기 저장
          get().saveSettings().catch(console.error);

          return {
            success: true,
            message,
            requiresReload,
          };
        },

        resetSettings: () => {
          set({
            settings: DEFAULT_SETTINGS,
            lastUpdated: new Date(),
            pendingChanges: {},
          });
        },

        saveSettings: async () => {
          const { settings } = get();

          try {
            const response = await fetch('/api/user/settings', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(settings),
            });

            if (!response.ok) {
              throw new Error('Failed to save settings');
            }

            set({ pendingChanges: {} });
            return true;

          } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
          }
        },

        loadSettings: async () => {
          set({ isLoading: true });

          try {
            const response = await fetch('/api/user/settings');
            if (response.ok) {
              const serverSettings = await response.json();
              set({
                settings: { ...DEFAULT_SETTINGS, ...serverSettings },
                lastUpdated: new Date(),
              });
            }
          } catch (error) {
            console.error('Failed to load settings:', error);
          } finally {
            set({ isLoading: false });
          }
        },
      }),
      {
        name: 'user-settings',
        partialize: (state) => ({ settings: state.settings }),
      }
    )
  )
);

/**
 * 테마 변경 감지 및 자동 적용 Hook
 */
export const useThemeSync = () => {
  const theme = useSettingsStore((state) => state.settings.theme);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const applyTheme = () => {
      document.documentElement.classList.remove('light', 'dark');

      if (theme === 'auto') {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.add(systemDark ? 'dark' : 'light');
      } else {
        document.documentElement.classList.add(theme);
      }
    };

    applyTheme();

    // 시스템 테마 변경 감지
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [theme]);
};

/**
 * 실시간 설정 동기화를 위한 WebSocket 리스너
 */
export const useSettingsSync = () => {
  const applyChatSettings = useSettingsStore((state) => state.applyChatSettings);

  React.useEffect(() => {
    // WebSocket이나 Server-Sent Events로 실시간 설정 동기화
    const handleSettingsUpdate = (event: CustomEvent) => {
      if (event.detail?.settingsAction) {
        applyChatSettings(event.detail.settingsAction);
      }
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
  }, [applyChatSettings]);
};