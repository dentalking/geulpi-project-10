/**
 * SettingsManager 초기화 컴포넌트
 * 앱 시작 시 ThemeProvider의 메서드들을 SettingsManager에 등록
 */

'use client';

import { useEffect } from 'react';
import { useTheme } from '@/providers/ThemeProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { settingsManager } from '@/services/SettingsManager';
import { routing, type Locale } from '@/i18n/config';

export function SettingsInitializer() {
  const { setTheme, setFontSize } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale() as Locale;

  useEffect(() => {
    console.log('[SettingsInitializer] Registering ThemeProvider methods to SettingsManager');

    // 언어 변경 핸들러
    const handleLocaleChange = (newLocale: Locale) => {
      const segments = pathname?.split('/').filter(Boolean) || [];
      const localeIndex = segments.findIndex(segment =>
        routing.locales.includes(segment as Locale)
      );

      if (localeIndex !== -1) {
        segments[localeIndex] = newLocale;
      } else {
        segments.unshift(newLocale);
      }

      const newPath = segments.join('/');
      const finalPath = `/${newPath}`;
      router.push(finalPath);
    };

    // SettingsManager에 실제 메서드들 등록
    settingsManager.registerSetters({
      setTheme: setTheme as any,
      setFontSize: setFontSize as any,
      handleLocaleChange: handleLocaleChange,
      // backgroundFocus는 나중에 필요시 추가
    });

    // 설정 변경 이벤트 리스너
    const handleSettingChanged = (event: any) => {
      console.log('[SettingsInitializer] Setting changed:', event);
    };

    settingsManager.on('settingChanged', handleSettingChanged);

    return () => {
      settingsManager.off('settingChanged', handleSettingChanged);
    };
  }, [setTheme, setFontSize, router, pathname]);

  // 이 컴포넌트는 UI를 렌더링하지 않음
  return null;
}