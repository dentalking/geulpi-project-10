'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Sun,
  Moon,
  Monitor,
  Type,
  Check,
  Globe,
  Palette,
  Languages,
  Calendar,
  Sparkles,
  Layers,
  Bell,
  Clock,
  MapPin,
  Users,
  AlertCircle
} from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { routing, localeNames, type Locale } from '@/i18n/config';
import { Modal, ModalBody } from '@/components/ui';
import { motion } from 'framer-motion';
import { settingsManager } from '@/services/SettingsManager';
import { useToast } from '@/hooks/useToast';

interface SettingsPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  showTriggerButton?: boolean;
  backgroundFocus?: 'background' | 'medium' | 'focus';
  onBackgroundFocusChange?: (level: 'background' | 'medium' | 'focus') => void;
}

export default function SettingsPanel({
  isOpen: externalIsOpen,
  onClose: externalOnClose,
  showTriggerButton = true,
  backgroundFocus = 'medium',
  onBackgroundFocusChange
}: SettingsPanelProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const defaultNotificationSettings = {
    reminder_enabled: true,
    reminder_minutes: 15,
    travel_enabled: true,
    travel_buffer_minutes: 30,
    preparation_enabled: false,
    preparation_minutes: 10,
    briefing_enabled: true,
    conflict_enabled: true
  };

  const [notificationSettings, setNotificationSettings] = useState(defaultNotificationSettings);
  const [savingSettings, setSavingSettings] = useState(false);

  const { theme, setTheme, fontSize, setFontSize } = useTheme();
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const handleClose = () => {
    if (externalOnClose) {
      externalOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const handleLocaleChange = (newLocale: Locale) => {
    const segments = pathname?.split('/').filter(Boolean) || [];
    const localeIndex = segments.findIndex(segment => routing.locales.includes(segment as Locale));

    if (localeIndex !== -1) {
      segments[localeIndex] = newLocale;
    } else {
      segments.unshift(newLocale);
    }

    const newPath = segments.join('/');
    const finalPath = `/${newPath}`;
    router.push(finalPath);
  };

  // SettingsManager에 메서드 등록
  useEffect(() => {
    console.log('[SettingsPanel] Registering setters to SettingsManager');
    settingsManager.registerSetters({
      setTheme: setTheme as any,
      setFontSize: setFontSize as any,
      handleLocaleChange,
      onBackgroundFocusChange
    });

    // 설정 변경 이벤트 리스너
    const handleSettingChanged = (event: any) => {
      console.log('[SettingsPanel] Setting changed from:', event.source, event);
    };

    settingsManager.on('settingChanged', handleSettingChanged);

    return () => {
      settingsManager.off('settingChanged', handleSettingChanged);
    };
  }, [setTheme, setFontSize, onBackgroundFocusChange]);

  // Load notification preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await fetch('/api/notifications/preferences');
        if (response.ok) {
          const { preferences } = await response.json();
          // Merge with defaults to prevent undefined properties
          setNotificationSettings({
            ...defaultNotificationSettings,
            ...preferences
          });
        }
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
        // Keep default settings on error
      }
    };

    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen]);

  const themeOptions = [
    { value: 'light', icon: Sun, label: t('landing.settings.themes.light'), color: 'from-yellow-400 to-orange-400' },
    { value: 'dark', icon: Moon, label: t('landing.settings.themes.dark'), color: 'from-blue-600 to-purple-600' },
    { value: 'system', icon: Monitor, label: t('landing.settings.themes.system'), color: 'from-gray-400 to-gray-600' }
  ] as const;

  const fontSizeOptions = [
    { value: 'small', label: t('landing.settings.fontSizes.small'), preview: '14px' },
    { value: 'normal', label: t('landing.settings.fontSizes.normal'), preview: '16px' },
    { value: 'large', label: t('landing.settings.fontSizes.large'), preview: '18px' },
    { value: 'extra-large', label: t('landing.settings.fontSizes.extraLarge'), preview: '20px' }
  ] as const;

  return (
    <>
      {/* Settings Button */}
      {showTriggerButton && (
        <button
          onClick={() => setInternalIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">{t('landing.settings.title')}</span>
        </button>
      )}

      {/* Settings Modal */}
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={t('landing.settings.title')}
        description={t('landing.settings.subtitle') || 'Customize your experience'}
        size="md"
      >
        <ModalBody className="space-y-6">
          {/* Theme Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg">
                <Palette className="w-4 h-4 text-purple-400" />
              </div>
              <h3 className="text-base font-medium text-white">
                {t('landing.settings.theme')}
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = theme === option.value;
                
                return (
                  <motion.button
                    key={option.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setTheme(option.value as any)}
                    className={`relative p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-gradient-to-br from-purple-600/20 to-blue-600/20 border-purple-500/50'
                        : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800/70 hover:border-gray-600'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    )}
                    <div className={`p-2 bg-gradient-to-br ${option.color} rounded-lg mb-2 mx-auto w-fit`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className={`text-sm font-medium ${
                      isSelected ? 'text-white' : 'text-gray-300'
                    }`}>
                      {option.label}
                    </p>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Font Size Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg">
                <Type className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="text-base font-medium text-white">
                {t('landing.settings.fontSize')}
              </h3>
            </div>
            <div className="space-y-2">
              {fontSizeOptions.map((option) => {
                const isSelected = fontSize === option.value;
                
                return (
                  <motion.button
                    key={option.value}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setFontSize(option.value as any)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-purple-500/50'
                        : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800/70 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-medium ${
                        isSelected ? 'text-white' : 'text-gray-300'
                      }`} style={{ fontSize: option.preview }}>
                        Aa
                      </span>
                      <span className={`text-sm ${
                        isSelected ? 'text-white' : 'text-gray-400'
                      }`}>
                        {option.label}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Language Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg">
                <Languages className="w-4 h-4 text-green-400" />
              </div>
              <h3 className="text-base font-medium text-white">
                {t('landing.settings.language')}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {routing.locales.map((loc) => {
                const isSelected = locale === loc;
                const flag = loc === 'ko' ? '🇰🇷' : '🇺🇸';
                
                return (
                  <motion.button
                    key={loc}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleLocaleChange(loc)}
                    className={`relative p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-gradient-to-br from-purple-600/20 to-blue-600/20 border-purple-500/50'
                        : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800/70 hover:border-gray-600'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    )}
                    <div className="text-2xl mb-2">{flag}</div>
                    <p className={`text-sm font-medium ${
                      isSelected ? 'text-white' : 'text-gray-300'
                    }`}>
                      {localeNames[loc]}
                    </p>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Notification Settings Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-lg">
                <Bell className="w-4 h-4 text-amber-400" />
              </div>
              <h3 className="text-base font-medium text-white">
                {locale === 'ko' ? '알림 설정' : 'Notification Settings'}
              </h3>
            </div>
            <div className="space-y-4">
              {/* Reminder Settings */}
              <div className="p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-white">
                      {locale === 'ko' ? '일정 리마인더' : 'Event Reminders'}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.reminder_enabled}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        reminder_enabled: e.target.checked
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-blue-600"></div>
                  </label>
                </div>
                {notificationSettings.reminder_enabled && (
                  <div className="mt-2">
                    <label className="text-xs text-gray-400">
                      {locale === 'ko' ? '알림 시간 (분 전)' : 'Notify before (minutes)'}
                    </label>
                    <select
                      value={notificationSettings.reminder_minutes}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        reminder_minutes: parseInt(e.target.value)
                      })}
                      className="mt-1 w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="15">15</option>
                      <option value="30">30</option>
                      <option value="60">60</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Travel Time Settings */}
              <div className="p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-white">
                      {locale === 'ko' ? '출발 알림' : 'Travel Notifications'}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.travel_enabled}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        travel_enabled: e.target.checked
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-blue-600"></div>
                  </label>
                </div>
                {notificationSettings.travel_enabled && (
                  <div className="mt-2">
                    <label className="text-xs text-gray-400">
                      {locale === 'ko' ? '이동 시간 버퍼 (분)' : 'Travel buffer (minutes)'}
                    </label>
                    <select
                      value={notificationSettings.travel_buffer_minutes}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        travel_buffer_minutes: parseInt(e.target.value)
                      })}
                      className="mt-1 w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      <option value="15">15</option>
                      <option value="30">30</option>
                      <option value="45">45</option>
                      <option value="60">60</option>
                      <option value="90">90</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Meeting Preparation Settings */}
              <div className="p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-white">
                      {locale === 'ko' ? '회의 준비' : 'Meeting Preparation'}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.preparation_enabled}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        preparation_enabled: e.target.checked
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-blue-600"></div>
                  </label>
                </div>
                {notificationSettings.preparation_enabled && (
                  <div className="mt-2">
                    <label className="text-xs text-gray-400">
                      {locale === 'ko' ? '준비 알림 시간 (분 전)' : 'Preparation time (minutes before)'}
                    </label>
                    <select
                      value={notificationSettings.preparation_minutes}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        preparation_minutes: parseInt(e.target.value)
                      })}
                      className="mt-1 w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      <option value="30">30</option>
                      <option value="45">45</option>
                      <option value="60">60</option>
                      <option value="90">90</option>
                      <option value="120">120</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Other Notifications */}
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl border border-gray-700/50 cursor-pointer hover:bg-gray-800/70 transition-colors">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-medium text-white">
                      {locale === 'ko' ? '일일 브리핑' : 'Daily Briefing'}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.briefing_enabled}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        briefing_enabled: e.target.checked
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-blue-600"></div>
                  </label>
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl border border-gray-700/50 cursor-pointer hover:bg-gray-800/70 transition-colors">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-medium text-white">
                      {locale === 'ko' ? '일정 충돌 알림' : 'Conflict Alerts'}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.conflict_enabled}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        conflict_enabled: e.target.checked
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-blue-600"></div>
                  </label>
                </label>
              </div>

              {/* Save Button */}
              <button
                onClick={async () => {
                  setSavingSettings(true);
                  try {
                    const response = await fetch('/api/notifications/preferences', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(notificationSettings)
                    });
                    if (response.ok) {
                      toast.success(
                        locale === 'ko' ? '알림 설정 저장됨' : 'Notification settings saved',
                        locale === 'ko' ? '설정이 성공적으로 저장되었습니다.' : 'Your preferences have been saved successfully.'
                      );
                    } else {
                      toast.error(
                        locale === 'ko' ? '저장 실패' : 'Save failed',
                        locale === 'ko' ? '설정 저장 중 오류가 발생했습니다.' : 'Failed to save notification settings.'
                      );
                    }
                  } catch (error) {
                    console.error('Failed to save notification settings:', error);
                    toast.error(
                      locale === 'ko' ? '저장 실패' : 'Save failed',
                      locale === 'ko' ? '네트워크 오류가 발생했습니다.' : 'A network error occurred.'
                    );
                  } finally {
                    setSavingSettings(false);
                  }
                }}
                disabled={savingSettings}
                className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              >
                {savingSettings
                  ? (locale === 'ko' ? '저장 중...' : 'Saving...')
                  : (locale === 'ko' ? '알림 설정 저장' : 'Save Notification Settings')}
              </button>
            </div>
          </div>

          {/* Background Opacity Section */}
          {onBackgroundFocusChange && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-lg">
                  <Layers className="w-4 h-4 text-indigo-400" />
                </div>
                <h3 className="text-base font-medium text-white">
                  {locale === 'ko' ? '배경 투명도' : 'Background Opacity'}
                </h3>
              </div>
              <div className="space-y-2">
                {[
                  { value: 'background' as const, label: locale === 'ko' ? '투명' : 'Transparent', description: locale === 'ko' ? '캘린더가 더 투명하게 표시됩니다' : 'Calendar appears more transparent' },
                  { value: 'medium' as const, label: locale === 'ko' ? '보통' : 'Medium', description: locale === 'ko' ? '균형잡힌 투명도' : 'Balanced opacity' },
                  { value: 'focus' as const, label: locale === 'ko' ? '선명' : 'Clear', description: locale === 'ko' ? '캘린더가 선명하게 표시됩니다' : 'Calendar appears clearly' }
                ].map((option) => {
                  const isSelected = backgroundFocus === option.value;

                  return (
                    <motion.button
                      key={option.value}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => onBackgroundFocusChange(option.value)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-purple-500/50'
                          : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800/70 hover:border-gray-600'
                      }`}
                    >
                      <div>
                        <span className={`font-medium ${
                          isSelected ? 'text-white' : 'text-gray-300'
                        }`}>
                          {option.label}
                        </span>
                        <p className={`text-xs mt-1 ${
                          isSelected ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          {option.description}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Info Section */}
          <div className="pt-4 border-t border-gray-800/50">
            <p className="text-xs text-gray-500 text-center">
              {t('landing.settings.info') || 'Your preferences are saved automatically'}
            </p>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
}