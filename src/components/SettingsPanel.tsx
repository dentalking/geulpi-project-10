'use client';

import { useState } from 'react';
import { 
  Settings, 
  Sun, 
  Moon, 
  Monitor,
  Type,
  Check,
  Globe,
  Palette,
  Languages
} from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { routing, localeNames, type Locale } from '@/i18n/config';
import { Modal, ModalBody } from '@/components/ui';
import { motion } from 'framer-motion';

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
  
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const handleClose = () => {
    if (externalOnClose) {
      externalOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

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