'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Sun, 
  Moon, 
  Monitor,
  Type,
  X,
  Check,
  Globe
} from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { routing, localeNames, type Locale } from '@/i18n/config';

interface SettingsPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  showTriggerButton?: boolean;
}

export default function SettingsPanel({ 
  isOpen: externalIsOpen, 
  onClose: externalOnClose,
  showTriggerButton = true 
}: SettingsPanelProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const { theme, setTheme, fontSize, setFontSize } = useTheme();
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  
  // Use external control if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const handleClose = () => {
    if (externalOnClose) {
      externalOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const themeOptions = [
    { value: 'light', icon: Sun, label: t('landing.settings.themes.light') },
    { value: 'dark', icon: Moon, label: t('landing.settings.themes.dark') },
    { value: 'system', icon: Monitor, label: t('landing.settings.themes.system') }
  ] as const;

  const fontSizeOptions = [
    { value: 'small', label: t('landing.settings.fontSizes.small'), preview: '17px' },
    { value: 'normal', label: t('landing.settings.fontSizes.normal'), preview: '19px' },
    { value: 'large', label: t('landing.settings.fontSizes.large'), preview: '21px' },
    { value: 'extra-large', label: t('landing.settings.fontSizes.extraLarge'), preview: '23px' }
  ] as const;

  const handleLocaleChange = (newLocale: Locale) => {
    const segments = pathname?.split('/') || [];
    const localeIndex = segments.findIndex(segment => routing.locales.includes(segment as Locale));
    
    if (localeIndex !== -1) {
      segments[localeIndex] = newLocale;
    } else {
      segments.unshift(newLocale);
    }
    
    const newPath = segments.filter(Boolean).join('/');
    router.push(`/${newPath}`);
  };

  return (
    <>
      {/* Settings Button */}
      {showTriggerButton && (
        <button
          onClick={() => setInternalIsOpen(true)}
          className={`flex items-center gap-2 px-4 py-3 min-h-[44px] backdrop-blur-sm border rounded-full transition-all group ${
            theme === 'light'
              ? 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700 hover:text-gray-900'
              : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
          }`}
          aria-label="Settings"
        >
          <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          <span className="text-sm font-medium hidden sm:inline">{t('common.settings')}</span>
        </button>
      )}

      {/* Settings Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`fixed right-0 top-0 bottom-0 w-full max-w-sm backdrop-blur-xl border-l shadow-2xl z-50 ${
                theme === 'light' 
                  ? 'bg-white/95 border-gray-200' 
                  : 'bg-black/90 border-white/20'
              }`}
            >
              <div className="p-6 h-full overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <h2 className={`text-xl font-semibold flex items-center gap-2 ${
                    theme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}>
                    <Settings className="w-5 h-5" />
                    {t('landing.settings.title')}
                  </h2>
                  <button
                    onClick={handleClose}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'light' 
                        ? 'hover:bg-gray-100' 
                        : 'hover:bg-white/10'
                    }`}
                    aria-label={t('landing.settings.closeSettings')}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Theme Section */}
                <section className="mb-8">
                  <h3 className={`text-sm font-medium mb-4 ${
                    theme === 'light' ? 'text-gray-600' : 'text-white/70'
                  }`}>{t('landing.settings.themeSection')}</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {themeOptions.map((option) => {
                      const Icon = option.icon;
                      const isSelected = theme === option.value;
                      
                      return (
                        <button
                          key={option.value}
                          onClick={() => setTheme(option.value as any)}
                          className={`
                            relative p-4 rounded-xl border transition-all
                            ${isSelected 
                              ? 'bg-purple-500/20 border-purple-500/50 shadow-lg' 
                              : theme === 'light'
                                ? 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }
                          `}
                          aria-label={`${option.label} ${t('common.theme')}`}
                          aria-pressed={isSelected}
                        >
                          <Icon className={`w-5 h-5 mx-auto mb-2 ${
                            isSelected 
                              ? 'text-purple-500' 
                              : theme === 'light' 
                                ? 'text-gray-500' 
                                : 'text-white/60'
                          }`} />
                          <span className={`text-xs ${
                            isSelected 
                              ? theme === 'light' ? 'text-gray-900' : 'text-white'
                              : theme === 'light' ? 'text-gray-600' : 'text-white/60'
                          }`}>
                            {option.label}
                          </span>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center"
                            >
                              <Check className="w-3 h-3 text-white" />
                            </motion.div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Font Size Section */}
                <section className="mb-8">
                  <h3 className={`text-sm font-medium mb-4 ${
                    theme === 'light' ? 'text-gray-600' : 'text-white/70'
                  }`}>
                    <Type className="w-4 h-4 inline mr-2" />
                    {t('landing.settings.fontSection')}
                  </h3>
                  <div className="space-y-2">
                    {fontSizeOptions.map((option) => {
                      const isSelected = fontSize === option.value;
                      
                      return (
                        <button
                          key={option.value}
                          onClick={() => setFontSize(option.value as any)}
                          className={`
                            w-full flex items-center justify-between p-3 rounded-lg border transition-all
                            ${isSelected 
                              ? 'bg-purple-500/20 border-purple-500/50' 
                              : theme === 'light'
                                ? 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }
                          `}
                          aria-label={`${t('common.fontSize')} ${option.label}`}
                          aria-pressed={isSelected}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-medium ${
                              isSelected 
                                ? theme === 'light' ? 'text-gray-900' : 'text-white'
                                : theme === 'light' ? 'text-gray-700' : 'text-white/80'
                            }`}>
                              {option.label}
                            </span>
                            <span className="text-xs text-white/50">
                              {option.preview}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Language Section */}
                <section className="mb-8">
                  <h3 className={`text-sm font-medium mb-4 ${
                    theme === 'light' ? 'text-gray-600' : 'text-white/70'
                  }`}>
                    <Globe className="w-4 h-4 inline mr-2" />
                    {t('common.language')}
                  </h3>
                  <div className="space-y-2">
                    {routing.locales.map((loc) => {
                      const isSelected = locale === loc;
                      
                      return (
                        <button
                          key={loc}
                          onClick={() => handleLocaleChange(loc as Locale)}
                          className={`
                            w-full flex items-center justify-between p-3 rounded-lg border transition-all
                            ${isSelected 
                              ? 'bg-purple-500/20 border-purple-500/50' 
                              : theme === 'light'
                                ? 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }
                          `}
                          aria-label={`${t('landing.settings.changeLanguage')} ${localeNames[loc as Locale]}`}
                          aria-pressed={isSelected}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-medium ${
                              isSelected 
                                ? theme === 'light' ? 'text-gray-900' : 'text-white'
                                : theme === 'light' ? 'text-gray-700' : 'text-white/80'
                            }`}>
                              {localeNames[loc as Locale]}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Preview Section */}
                <section className={`p-4 rounded-xl border ${
                  theme === 'light' 
                    ? 'bg-gray-50 border-gray-200' 
                    : 'bg-white/5 border-white/10'
                }`}>
                  <h4 className={`text-xs font-medium mb-2 ${
                    theme === 'light' ? 'text-gray-500' : 'text-white/50'
                  }`}>{t('landing.settings.previewSection')}</h4>
                  <p className={theme === 'light' ? 'text-gray-900' : 'text-white/90'}>
                    {t('landing.settings.previewText')}
                  </p>
                  <p className={`text-sm mt-2 ${
                    theme === 'light' ? 'text-gray-600' : 'text-white/70'
                  }`}>
                    {t('landing.settings.previewSubtext')}
                  </p>
                </section>

                {/* Additional Info */}
                <div className={`mt-8 p-4 rounded-lg border ${
                  theme === 'light'
                    ? 'bg-purple-50 border-purple-200'
                    : 'bg-purple-500/10 border-purple-500/30'
                }`}>
                  <p className={`text-xs ${
                    theme === 'light' ? 'text-purple-700' : 'text-purple-200'
                  }`}>
                    {t('common.autoSave')}
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}