/**
 * 채팅 기반 설정 제어 서비스 V2
 * SettingsManager를 통해 기존 설정 메서드를 트리거하는 방식
 */

import { settingsManager, Theme, FontSize, Locale, BackgroundFocus } from '@/services/SettingsManager';

export interface SettingsResponse {
  message: string;
  success: boolean;
  requiresReload?: boolean;
  settingChanged?: {
    setting: string;
    oldValue: any;
    newValue: any;
  };
}

export class SettingsControlServiceV2 {
  /**
   * 안전한 설정 변경 패턴들 (AI 호출 없이 로컬 처리)
   */
  private readonly PATTERNS = {
    // 테마 관련
    theme: {
      light: [
        /라이트.*모드/i,
        /밝은.*테마/i,
        /화이트.*모드/i,
        /light.*mode/i,
        /밝게.*해/i
      ],
      dark: [
        /다크.*모드/i,
        /어두운.*테마/i,
        /다크.*테마/i,
        /dark.*mode/i,
        /어둡게.*해/i,
        /검은.*테마/i
      ],
      auto: [
        /자동.*모드/i,
        /시스템.*따라/i,
        /auto.*theme/i,
        /자동.*테마/i
      ]
    },

    // 언어 관련 (더 구체적인 패턴으로 수정)
    language: {
      korean: [
        /한국어.*모드/i,
        /한국어.*변경/i,
        /한국어.*전환/i,
        /한국어로.*변경/i,
        /한국어로.*바꿔/i,
        /한국어로.*해/i,
        /한글.*모드/i,
        /한글로.*변경/i,
        /한글로.*바꿔/i,
        /\b한국어\b/i,
        /\b한글\b/i,
        /\bkorean\b/i,
        /^ko$/i,
        /언어.*한국어/i,
        /언어.*한글/i
      ],
      english: [
        /영어.*모드/i,
        /영어.*변경/i,
        /영어.*전환/i,
        /영어로.*변경/i,
        /영어로.*바꿔/i,
        /영어로.*해/i,
        /\b영어\b/i,
        /\benglish\b/i,
        /^en$/i,
        /\b잉글리시\b/i,
        /언어.*영어/i,
        /언어.*english/i
      ]
    },

    // 알림 관련
    notification: {
      enable: [
        /알림.*켜/i,
        /알림.*활성/i,
        /notification.*on/i,
        /푸시.*켜/i
      ],
      disable: [
        /알림.*꺼/i,
        /알림.*끄/i,
        /notification.*off/i,
        /푸시.*꺼/i,
        /조용.*모드/i
      ]
    },

    // 폰트 크기 관련
    fontSize: {
      small: [
        /작은.*글씨/i,
        /글씨.*작게/i,
        /폰트.*작게/i,
        /small.*font/i
      ],
      normal: [
        /보통.*글씨/i,
        /기본.*글씨/i,
        /normal.*font/i,
        /폰트.*보통/i
      ],
      large: [
        /큰.*글씨/i,
        /글씨.*크게/i,
        /폰트.*크게/i,
        /large.*font/i
      ],
      extraLarge: [
        /아주.*큰.*글씨/i,
        /글씨.*아주.*크게/i,
        /extra.*large/i,
        /특대.*글씨/i
      ]
    },

    // 배경 투명도
    background: {
      transparent: [
        /투명.*배경/i,
        /배경.*투명/i,
        /transparent/i,
        /흐릿하게/i
      ],
      medium: [
        /보통.*배경/i,
        /배경.*보통/i,
        /중간.*투명/i,
        /medium/i
      ],
      clear: [
        /선명.*배경/i,
        /배경.*선명/i,
        /clear/i,
        /뚜렷하게/i
      ]
    }
  };

  /**
   * 보안상 제한된 명령어들
   */
  private readonly RESTRICTED_PATTERNS = [
    /비밀번호/i,
    /password/i,
    /계정.*삭제/i,
    /delete.*account/i,
    /관리자/i,
    /admin/i,
    /권한/i,
    /permission/i,
    /결제/i,
    /payment/i,
    /구독.*취소/i
  ];

  /**
   * 메시지에서 설정 명령어 감지 및 처리
   */
  async parseAndExecute(message: string): Promise<SettingsResponse | null> {
    // 1. 보안 검사
    if (this.isRestrictedCommand(message)) {
      return {
        message: "보안상 해당 설정은 직접 설정 메뉴에서 변경해주세요. 🔒",
        success: false
      };
    }

    // 2. 패턴 매칭 및 실행
    const result = await this.matchAndExecute(message);
    if (result) {
      return result;
    }

    // 3. 설정과 무관한 메시지
    return null;
  }

  /**
   * 패턴 매칭 후 SettingsManager 메서드 호출
   */
  private async matchAndExecute(message: string): Promise<SettingsResponse | null> {
    // 테마 변경
    for (const [theme, patterns] of Object.entries(this.PATTERNS.theme)) {
      if (patterns.some(pattern => pattern.test(message))) {
        const targetTheme = theme === 'auto' ? 'system' : theme as Theme;

        // 현재 실제 표시되는 테마와 설정값 모두 확인
        const currentActualTheme = this.getCurrentActualTheme();
        const currentThemeSetting = this.getCurrentThemeSetting();

        console.log('[SettingsControlServiceV2] Current actual theme:', currentActualTheme,
                    'Current setting:', currentThemeSetting, 'Target:', targetTheme);

        // 이미 원하는 상태인지 확인
        // 'system' 요청이 아닌 경우, 실제 표시되는 테마를 확인
        if (targetTheme !== 'system') {
          // 다크/라이트 모드 요청 시 실제 표시되는 테마와 비교
          if (currentActualTheme === targetTheme) {
            return {
              message: `이미 ${this.getThemeLabel(targetTheme)} 모드입니다.`,
              success: false
            };
          }
        } else {
          // system 모드 요청 시 현재 설정이 이미 system인지 확인
          if (currentThemeSetting === 'system') {
            return {
              message: `이미 자동 모드입니다.`,
              success: false
            };
          }
        }

        const oldValue = currentThemeSetting;
        const success = await settingsManager.changeTheme(targetTheme, 'chat');

        return {
          message: `${this.getThemeLabel(targetTheme)} 모드로 변경되었습니다! ✨`,
          success: true,
          settingChanged: {
            setting: 'theme',
            oldValue,
            newValue: targetTheme
          }
        };
      }
    }

    // 언어 변경
    for (const [lang, patterns] of Object.entries(this.PATTERNS.language)) {
      if (patterns.some(pattern => pattern.test(message))) {
        const locale = lang === 'korean' ? 'ko' : 'en' as Locale;
        const currentLocale = this.getCurrentLocale();

        console.log('[SettingsControlServiceV2] Language change detected:', {
          message,
          targetLang: lang,
          targetLocale: locale,
          currentLocale,
          matchedPattern: patterns.find(p => p.test(message))?.toString()
        });

        // URL 기반으로 정확한 현재 locale 확인
        const urlPath = window.location.pathname;
        const urlSegments = urlPath.split('/').filter(Boolean);
        const urlLocale = ['ko', 'en'].includes(urlSegments[0]) ? urlSegments[0] : currentLocale;

        console.log('[SettingsControlServiceV2] URL locale check:', {
          urlPath,
          urlLocale,
          detectedLocale: currentLocale,
          targetLocale: locale
        });

        // URL 기반으로 비교
        if (urlLocale === locale) {
          return {
            message: `이미 ${lang === 'korean' ? '한국어' : '영어'}로 설정되어 있습니다.`,
            success: false
          };
        }

        const oldValue = urlLocale;
        const success = await settingsManager.changeLocale(locale, 'chat');

        // 언어 변경은 페이지 리로드가 필요하므로 즉시 메시지 반환
        return {
          message: `언어를 ${lang === 'korean' ? '한국어' : '영어'}로 변경합니다... 🌍\n잠시 후 페이지가 새로고침됩니다.`,
          success: true,
          requiresReload: true,
          settingChanged: {
            setting: 'locale',
            oldValue,
            newValue: locale
          }
        };
      }
    }

    // 알림 설정
    for (const [setting, patterns] of Object.entries(this.PATTERNS.notification)) {
      if (patterns.some(pattern => pattern.test(message))) {
        const enabled = setting === 'enable';
        const currentEnabled = settingsManager.getSetting('notifications')?.enabled ?? true;

        if (currentEnabled === enabled) {
          return {
            message: `알림이 이미 ${enabled ? '켜져' : '꺼져'} 있습니다.`,
            success: false
          };
        }

        const success = await settingsManager.changeNotifications(enabled, 'chat');

        return {
          message: `알림을 ${enabled ? '켰습니다' : '껐습니다'}! ${enabled ? '🔔' : '🔕'}`,
          success: true,
          settingChanged: {
            setting: 'notifications',
            oldValue: !enabled,
            newValue: enabled
          }
        };
      }
    }

    // 폰트 크기 변경
    for (const [size, patterns] of Object.entries(this.PATTERNS.fontSize)) {
      if (patterns.some(pattern => pattern.test(message))) {
        let fontSizeValue: FontSize;
        switch (size) {
          case 'small': fontSizeValue = 'small'; break;
          case 'normal': fontSizeValue = 'normal'; break;
          case 'large': fontSizeValue = 'large'; break;
          case 'extraLarge': fontSizeValue = 'extra-large'; break;
          default: fontSizeValue = 'normal';
        }

        const currentFontSize = this.getCurrentFontSize();
        if (currentFontSize === fontSizeValue) {
          return {
            message: `글씨 크기가 이미 ${this.getFontSizeLabel(fontSizeValue)}입니다.`,
            success: false
          };
        }

        const success = await settingsManager.changeFontSize(fontSizeValue, 'chat');

        return {
          message: `글씨 크기를 ${this.getFontSizeLabel(fontSizeValue)}로 변경했습니다! 📝`,
          success: true,
          settingChanged: {
            setting: 'fontSize',
            oldValue: settingsManager.getSetting('fontSize'),
            newValue: fontSizeValue
          }
        };
      }
    }

    // 배경 투명도 변경
    for (const [bg, patterns] of Object.entries(this.PATTERNS.background)) {
      if (patterns.some(pattern => pattern.test(message))) {
        let bgValue: BackgroundFocus;
        switch (bg) {
          case 'transparent': bgValue = 'background'; break;
          case 'medium': bgValue = 'medium'; break;
          case 'clear': bgValue = 'focus'; break;
          default: bgValue = 'medium';
        }

        const currentBg = settingsManager.getSetting('backgroundFocus');
        if (currentBg === bgValue) {
          return {
            message: `배경이 이미 ${this.getBackgroundLabel(bgValue)} 상태입니다.`,
            success: false
          };
        }

        const success = await settingsManager.changeBackgroundFocus(bgValue, 'chat');

        return {
          message: `배경을 ${this.getBackgroundLabel(bgValue)} 상태로 변경했습니다! 🎨`,
          success: true,
          settingChanged: {
            setting: 'backgroundFocus',
            oldValue: settingsManager.getSetting('backgroundFocus'),
            newValue: bgValue
          }
        };
      }
    }

    return null;
  }

  /**
   * 제한된 명령어 확인
   */
  private isRestrictedCommand(message: string): boolean {
    return this.RESTRICTED_PATTERNS.some(pattern => pattern.test(message));
  }

  /**
   * 현재 테마 설정값 가져오기 (light, dark, system)
   */
  private getCurrentThemeSetting(): Theme {
    // localStorage에서 설정값 확인
    const storedTheme = localStorage.getItem('theme') as Theme;
    if (storedTheme) {
      return storedTheme;
    }
    return 'system';
  }

  /**
   * 현재 실제로 렌더링된 테마 가져오기 (light 또는 dark)
   * system 설정인 경우 실제 표시되는 테마를 반환
   */
  private getCurrentActualTheme(): 'light' | 'dark' {
    // 1. DOM class를 먼저 확인 (가장 정확한 현재 상태)
    const htmlElement = document.documentElement;
    if (htmlElement.classList.contains('dark')) {
      return 'dark';
    } else if (htmlElement.classList.contains('light')) {
      return 'light';
    }

    // 2. data-theme 속성 확인
    const dataTheme = htmlElement.getAttribute('data-theme');
    if (dataTheme === 'dark' || dataTheme === 'light') {
      return dataTheme as 'light' | 'dark';
    }

    // 3. 시스템 테마 확인 (system 설정인 경우)
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDarkMode ? 'dark' : 'light';
  }

  /**
   * 현재 언어 설정 가져오기
   */
  private getCurrentLocale(): Locale {
    // 1. URL path에서 먼저 확인 (가장 정확한 현재 상태)
    const path = window.location.pathname;
    const segments = path.split('/').filter(Boolean);
    if (segments[0] === 'ko' || segments[0] === 'en') {
      console.log('[getCurrentLocale] Found in URL path:', segments[0]);
      return segments[0] as Locale;
    }

    // 2. localStorage에서 확인
    const storedLocale = localStorage.getItem('locale');
    if (storedLocale === 'ko' || storedLocale === 'en') {
      console.log('[getCurrentLocale] Found in localStorage:', storedLocale);
      return storedLocale as Locale;
    }

    // 3. 실제 UI 텍스트로 감지 (더 정확한 방법)
    const bodyText = document.body?.innerText || '';
    // 특징적인 UI 텍스트로 언어 감지
    const koreanIndicators = ['일정', '추가', '오늘', '내일', '설정', '캘린더'];
    const englishIndicators = ['Events', 'Add', 'Today', 'Tomorrow', 'Settings', 'Calendar'];

    const koCount = koreanIndicators.filter(text => bodyText.includes(text)).length;
    const enCount = englishIndicators.filter(text => bodyText.includes(text)).length;

    if (enCount > koCount) {
      console.log('[getCurrentLocale] Detected English from UI text');
      return 'en';
    } else if (koCount > 0) {
      console.log('[getCurrentLocale] Detected Korean from UI text');
      return 'ko';
    }

    // 4. 브라우저 언어 설정 확인
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('en')) {
      console.log('[getCurrentLocale] Browser language is English');
      return 'en';
    } else if (browserLang.startsWith('ko')) {
      console.log('[getCurrentLocale] Browser language is Korean');
      return 'ko';
    }

    // 5. 기본값 (브라우저 언어에 따라)
    // HTML lang="ko" 하드코딩 문제로 인해 제거
    console.log('[getCurrentLocale] Using default based on browser:', browserLang.startsWith('en') ? 'en' : 'ko');
    return browserLang.startsWith('en') ? 'en' : 'ko';
  }

  /**
   * 현재 폰트 크기 가져오기
   */
  private getCurrentFontSize(): FontSize {
    const stored = localStorage.getItem('fontSize') as FontSize;
    if (stored) {
      return stored;
    }

    // CSS 변수 확인
    const fontBase = getComputedStyle(document.documentElement).getPropertyValue('--font-base');
    if (fontBase) {
      if (fontBase.includes('14') || fontBase.includes('17')) return 'small';
      if (fontBase.includes('18') || fontBase.includes('21')) return 'large';
      if (fontBase.includes('20') || fontBase.includes('23')) return 'extra-large';
    }

    return 'normal';
  }

  /**
   * 레이블 헬퍼 함수들
   */
  private getThemeLabel(theme: Theme): string {
    switch (theme) {
      case 'light': return '라이트';
      case 'dark': return '다크';
      case 'system': return '자동';
      default: return '알 수 없음';
    }
  }

  private getFontSizeLabel(size: FontSize): string {
    switch (size) {
      case 'small': return '작게';
      case 'normal': return '보통';
      case 'large': return '크게';
      case 'extra-large': return '아주 크게';
      default: return '보통';
    }
  }

  private getBackgroundLabel(bg: BackgroundFocus): string {
    switch (bg) {
      case 'background': return '투명한';
      case 'medium': return '보통';
      case 'focus': return '선명한';
      default: return '보통';
    }
  }

  /**
   * 특별한 명령어들 (확인 필요)
   */
  async handleSpecialCommands(message: string): Promise<SettingsResponse | null> {
    const lowerMessage = message.toLowerCase();

    // 설정 초기화
    if (/설정.*초기화|reset.*settings/i.test(lowerMessage)) {
      return {
        message: "설정을 초기화하시겠습니까? '네, 초기화합니다'라고 답해주세요.",
        success: false
      };
    }

    // 설정 초기화 확인
    if (/네.*초기화|yes.*reset/i.test(lowerMessage)) {
      settingsManager.resetSettings('chat');
      return {
        message: "모든 설정이 초기화되었습니다. 🔄",
        success: true,
        requiresReload: true
      };
    }

    return null;
  }
}