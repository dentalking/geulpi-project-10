/**
 * 중앙 집중식 설정 관리자
 * 모든 설정 변경이 이곳을 통해 이루어짐 (Single Source of Truth)
 * 채팅과 UI 모두 이 메서드들을 호출
 */

import { EventEmitter } from 'events';

export type Theme = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'normal' | 'large' | 'extra-large';
export type Locale = 'ko' | 'en';
export type BackgroundFocus = 'background' | 'medium' | 'focus';

export interface SettingsState {
  theme: Theme;
  fontSize: FontSize;
  locale: Locale;
  backgroundFocus: BackgroundFocus;
  notifications: {
    enabled: boolean;
    sound: boolean;
    email: boolean;
  };
}

export interface SettingsChangeEvent {
  setting: keyof SettingsState;
  oldValue: any;
  newValue: any;
  source: 'chat' | 'ui' | 'system';
}

class SettingsManager extends EventEmitter {
  private static instance: SettingsManager;
  private settings: SettingsState;
  private themeSetterRef?: (theme: Theme) => void;
  private fontSizeSetterRef?: (size: FontSize) => void;
  private localeChangeRef?: (locale: Locale) => void;
  private backgroundFocusRef?: (level: BackgroundFocus) => void;

  private constructor() {
    super();

    // 기본 설정값
    this.settings = {
      theme: 'system',
      fontSize: 'normal',
      locale: 'ko',
      backgroundFocus: 'medium',
      notifications: {
        enabled: true,
        sound: true,
        email: true
      }
    };

    // 로컬 스토리지에서 설정 복원
    this.loadFromStorage();
  }

  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  /**
   * 기존 설정 UI 메서드들을 등록
   * SettingsPanel 컴포넌트에서 mount 시 호출
   */
  registerSetters(setters: {
    setTheme?: (theme: Theme) => void;
    setFontSize?: (size: FontSize) => void;
    handleLocaleChange?: (locale: Locale) => void;
    onBackgroundFocusChange?: (level: BackgroundFocus) => void;
  }) {
    if (setters.setTheme) this.themeSetterRef = setters.setTheme;
    if (setters.setFontSize) this.fontSizeSetterRef = setters.setFontSize;
    if (setters.handleLocaleChange) this.localeChangeRef = setters.handleLocaleChange;
    if (setters.onBackgroundFocusChange) this.backgroundFocusRef = setters.onBackgroundFocusChange;

    console.log('[SettingsManager] Setters registered:', {
      hasTheme: !!this.themeSetterRef,
      hasFontSize: !!this.fontSizeSetterRef,
      hasLocale: !!this.localeChangeRef,
      hasBackground: !!this.backgroundFocusRef
    });
  }

  /**
   * 테마 변경 - 기존 UI 메서드 호출
   */
  async changeTheme(theme: Theme, source: 'chat' | 'ui' | 'system' = 'system'): Promise<boolean> {
    const oldValue = this.settings.theme;

    if (oldValue === theme) {
      return false; // 이미 같은 값
    }

    // 기존 UI 메서드가 등록되어 있으면 호출
    if (this.themeSetterRef) {
      this.themeSetterRef(theme);
      this.settings.theme = theme;

      // 이벤트 발생
      this.emit('settingChanged', {
        setting: 'theme',
        oldValue,
        newValue: theme,
        source
      } as SettingsChangeEvent);

      this.saveToStorage();
      return true;
    }

    // Fallback: localStorage를 직접 업데이트하고 ThemeProvider가 감지하도록 함
    this.settings.theme = theme;

    // localStorage에 직접 저장 (ThemeProvider가 감지할 수 있도록)
    localStorage.setItem('theme', theme);

    // Custom event 발생시켜 ThemeProvider가 변경사항을 감지하도록 함
    // (storage event는 동일 윈도우에서는 발생하지 않음)
    window.dispatchEvent(new CustomEvent('themeChanged', {
      detail: { theme, source }
    }));

    // DOM에도 즉시 반영
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.setAttribute('data-theme', theme === 'system' ?
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme);

    if (theme !== 'system') {
      document.documentElement.classList.add(theme);
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.add(systemDark ? 'dark' : 'light');
    }

    this.saveToStorage();
    return true;
  }

  /**
   * 폰트 크기 변경
   */
  async changeFontSize(size: FontSize, source: 'chat' | 'ui' | 'system' = 'system'): Promise<boolean> {
    const oldValue = this.settings.fontSize;

    if (oldValue === size) {
      return false;
    }

    if (this.fontSizeSetterRef) {
      this.fontSizeSetterRef(size);
      this.settings.fontSize = size;

      this.emit('settingChanged', {
        setting: 'fontSize',
        oldValue,
        newValue: size,
        source
      } as SettingsChangeEvent);

      this.saveToStorage();
      return true;
    }

    // Fallback: localStorage를 업데이트하고 ThemeProvider가 감지하도록 함
    this.settings.fontSize = size;

    // localStorage에 직접 저장
    localStorage.setItem('fontSize', size);

    // Custom event 발생
    window.dispatchEvent(new CustomEvent('fontSizeChanged', {
      detail: { fontSize: size, source }
    }));

    // CSS 변수도 즉시 설정
    const fontSizeMap: Record<FontSize, string> = {
      'small': '14px',
      'normal': '16px',
      'large': '18px',
      'extra-large': '20px'
    };

    document.documentElement.style.setProperty('--base-font-size', fontSizeMap[size]);
    this.saveToStorage();
    return true;
  }

  /**
   * 언어 변경
   */
  async changeLocale(locale: Locale, source: 'chat' | 'ui' | 'system' = 'system'): Promise<boolean> {
    const oldValue = this.settings.locale;

    console.log('[SettingsManager] changeLocale called:', {
      oldValue,
      newValue: locale,
      source,
      hasLocaleChangeRef: !!this.localeChangeRef,
      currentPath: window.location.pathname
    });

    // 먼저 URL에서 현재 실제 locale 확인
    const currentPath = window.location.pathname;
    const segments = currentPath.split('/').filter(Boolean);
    const currentUrlLocale = ['ko', 'en'].includes(segments[0]) ? segments[0] : null;

    console.log('[SettingsManager] Current URL locale:', currentUrlLocale);

    // URL locale과 비교하여 실제로 변경이 필요한지 확인
    if (currentUrlLocale === locale) {
      console.log('[SettingsManager] Already in target locale (URL), skipping');
      // localStorage도 맞춰서 업데이트
      localStorage.setItem('locale', locale);
      this.settings.locale = locale;
      this.saveToStorage();
      return false;
    }

    // localStorage에 먼저 저장 (페이지 리로드 후에도 유지)
    this.settings.locale = locale;
    localStorage.setItem('locale', locale);
    this.saveToStorage();

    // chat에서 호출한 경우 무조건 페이지 리로드
    if (source === 'chat') {
      console.log('[SettingsManager] Chat source - forcing page reload');

      // URL 경로 재계산
      const localeIndex = segments.findIndex(seg => ['ko', 'en'].includes(seg));

      if (localeIndex !== -1) {
        segments[localeIndex] = locale;
      } else {
        // locale이 없는 경우 첫 번째 위치에 추가
        segments.unshift(locale);
      }

      const newPath = '/' + segments.join('/');
      const fullUrl = window.location.origin + newPath;

      console.log('[SettingsManager] Calculated redirect:', {
        from: currentPath,
        to: newPath,
        fullUrl: fullUrl
      });

      // 즉시 리디렉션 (메시지는 이미 표시됨)
      // setTimeout을 짧게 하여 메시지를 볼 수 있게 하되, 더 빠르게 전환
      setTimeout(() => {
        console.log('[SettingsManager] Executing redirect to:', fullUrl);
        // location.href 사용으로 더 확실한 리디렉션
        window.location.href = fullUrl;
      }, 500);  // 0.5초로 단축

      return true;
    }

    // UI에서 호출한 경우 기존 방식 사용
    if (this.localeChangeRef) {
      console.log('[SettingsManager] Using localeChangeRef for UI source');
      this.localeChangeRef(locale);

      this.emit('settingChanged', {
        setting: 'locale',
        oldValue,
        newValue: locale,
        source
      } as SettingsChangeEvent);

      return true;
    }

    // Fallback: URL 변경으로 페이지 리로드
    console.log('[SettingsManager] Using URL fallback for locale change');
    const fallbackPath = window.location.pathname;
    const fallbackSegments = fallbackPath.split('/').filter(Boolean);
    const localeIndex = fallbackSegments.findIndex(seg => ['ko', 'en'].includes(seg));

    if (localeIndex !== -1) {
      fallbackSegments[localeIndex] = locale;
    } else {
      fallbackSegments.unshift(locale);
    }

    const newPath = '/' + fallbackSegments.join('/');
    console.log('[SettingsManager] Redirecting to:', newPath);

    // 약간의 지연 후 리다이렉트 (UI 피드백을 위해)
    setTimeout(() => {
      window.location.pathname = newPath;
    }, 100);

    return true;
  }

  /**
   * 배경 투명도 변경
   */
  async changeBackgroundFocus(level: BackgroundFocus, source: 'chat' | 'ui' | 'system' = 'system'): Promise<boolean> {
    const oldValue = this.settings.backgroundFocus;

    if (oldValue === level) {
      return false;
    }

    if (this.backgroundFocusRef) {
      this.backgroundFocusRef(level);
      this.settings.backgroundFocus = level;

      this.emit('settingChanged', {
        setting: 'backgroundFocus',
        oldValue,
        newValue: level,
        source
      } as SettingsChangeEvent);

      this.saveToStorage();
      return true;
    }

    this.settings.backgroundFocus = level;
    this.saveToStorage();
    return true;
  }

  /**
   * 알림 설정 변경
   */
  async changeNotifications(enabled: boolean, source: 'chat' | 'ui' | 'system' = 'system'): Promise<boolean> {
    const oldValue = this.settings.notifications.enabled;

    if (oldValue === enabled) {
      return false;
    }

    this.settings.notifications.enabled = enabled;

    // 브라우저 알림 권한 요청
    if (enabled && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    this.emit('settingChanged', {
      setting: 'notifications',
      oldValue,
      newValue: enabled,
      source
    } as SettingsChangeEvent);

    this.saveToStorage();
    return true;
  }

  /**
   * 현재 설정 상태 가져오기
   */
  getSettings(): Readonly<SettingsState> {
    return { ...this.settings };
  }

  /**
   * 특정 설정값 가져오기
   */
  getSetting<K extends keyof SettingsState>(key: K): SettingsState[K] {
    return this.settings[key];
  }

  /**
   * 설정 검증
   */
  validateSetting(setting: keyof SettingsState, value: any): boolean {
    switch (setting) {
      case 'theme':
        return ['light', 'dark', 'system'].includes(value);
      case 'fontSize':
        return ['small', 'normal', 'large', 'extra-large'].includes(value);
      case 'locale':
        return ['ko', 'en'].includes(value);
      case 'backgroundFocus':
        return ['background', 'medium', 'focus'].includes(value);
      default:
        return false;
    }
  }

  /**
   * 로컬 스토리지에 저장
   */
  private saveToStorage() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('app-settings', JSON.stringify(this.settings));
    }
  }

  /**
   * 로컬 스토리지 및 DOM에서 현재 상태 로드
   * ThemeProvider와 완전히 동기화
   */
  private loadFromStorage() {
    if (typeof window !== 'undefined') {
      // 1. Theme: localStorage -> DOM fallback
      const storedTheme = localStorage.getItem('theme') as Theme;
      if (storedTheme) {
        this.settings.theme = storedTheme;
      } else {
        // DOM에서 실제 테마 확인
        const htmlElement = document.documentElement;
        if (htmlElement.classList.contains('dark')) {
          this.settings.theme = 'dark';
        } else if (htmlElement.classList.contains('light')) {
          this.settings.theme = 'light';
        } else {
          this.settings.theme = 'system';
        }
      }

      // 2. FontSize: localStorage -> CSS variable fallback
      const storedFontSize = localStorage.getItem('fontSize') as FontSize;
      if (storedFontSize) {
        this.settings.fontSize = storedFontSize;
      } else {
        // CSS 변수에서 폰트 크기 추론
        const fontBase = getComputedStyle(document.documentElement).getPropertyValue('--font-base');
        if (fontBase) {
          if (fontBase.includes('17')) this.settings.fontSize = 'small';
          else if (fontBase.includes('21')) this.settings.fontSize = 'large';
          else if (fontBase.includes('23')) this.settings.fontSize = 'extra-large';
          else this.settings.fontSize = 'normal';
        }
      }

      // 3. 기타 설정은 app-settings에서 로드
      const saved = localStorage.getItem('app-settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // theme과 fontSize는 위에서 이미 로드했으므로 제외
          const { theme: _, fontSize: __, ...otherSettings } = parsed;
          this.settings = { ...this.settings, ...otherSettings };
        } catch (error) {
          console.error('[SettingsManager] Failed to parse saved settings:', error);
        }
      }

      console.log('[SettingsManager] Loaded settings from storage/DOM:', this.settings);
    }
  }

  /**
   * 설정 초기화
   */
  resetSettings(source: 'chat' | 'ui' | 'system' = 'system') {
    const defaults: SettingsState = {
      theme: 'system',
      fontSize: 'normal',
      locale: 'ko',
      backgroundFocus: 'medium',
      notifications: {
        enabled: true,
        sound: true,
        email: true
      }
    };

    // 모든 설정을 기본값으로 변경
    this.changeTheme(defaults.theme, source);
    this.changeFontSize(defaults.fontSize, source);
    this.changeLocale(defaults.locale, source);
    this.changeBackgroundFocus(defaults.backgroundFocus, source);
    this.changeNotifications(defaults.notifications.enabled, source);

    this.emit('settingsReset', { source });
  }
}

// Singleton instance export
export const settingsManager = SettingsManager.getInstance();