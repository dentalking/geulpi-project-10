/**
 * 채팅 기반 설정 제어 서비스
 * 자연어로 서비스 설정을 변경할 수 있는 기능 제공
 */

import { ChatCalendarService, ChatResponse } from './ChatCalendarService';

export interface SettingsAction {
  type: 'theme' | 'language' | 'notification' | 'privacy' | 'account' | 'ui' | 'calendar_view';
  subtype?: string;
  value?: any;
  requiresConfirmation?: boolean;
  securityLevel: 'safe' | 'medium' | 'restricted';
}

export interface SettingsResponse extends ChatResponse {
  settingsAction?: SettingsAction;
  previewChanges?: {
    setting: string;
    oldValue: any;
    newValue: any;
    description: string;
  }[];
}

export class SettingsControlService {

  /**
   * 안전한 설정 변경 패턴들 (AI 호출 없이 로컬 처리)
   */
  private readonly SAFE_PATTERNS = {
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

    // 언어 관련
    language: {
      korean: [
        /한국어/i,
        /한글/i,
        /korean/i,
        /ko/i
      ],
      english: [
        /영어/i,
        /english/i,
        /en/i,
        /잉글리시/i
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

    // UI 관련
    ui: {
      compact: [
        /간단.*모드/i,
        /컴팩트/i,
        /작게.*해/i,
        /compact/i
      ],
      comfortable: [
        /편안.*모드/i,
        /크게.*해/i,
        /comfortable/i,
        /여유롭게/i
      ]
    },

    // 캘린더 보기 관련
    calendar_view: {
      month: [
        /월.*보기/i,
        /월.*뷰/i,
        /month.*view/i,
        /한달.*보기/i
      ],
      week: [
        /주.*보기/i,
        /주.*뷰/i,
        /week.*view/i,
        /일주일.*보기/i
      ],
      day: [
        /일.*보기/i,
        /하루.*보기/i,
        /day.*view/i,
        /데일리/i
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
    /로그아웃/i,
    /logout/i, // 로그아웃은 확인 필요
    /결제/i,
    /payment/i,
    /구독.*취소/i
  ];

  /**
   * 메시지에서 설정 명령어 감지 및 처리
   */
  async parseSettingsCommand(message: string): Promise<SettingsResponse | null> {
    const lowerMessage = message.toLowerCase();

    // 1. 보안 검사 - 제한된 명령어 확인
    if (this.isRestrictedCommand(message)) {
      return {
        message: "죄송합니다. 보안상 해당 설정은 직접 설정 메뉴에서 변경해주세요. 🔒"
      };
    }

    // 2. 안전한 로컬 패턴 매칭 (AI 호출 없음)
    const localResult = this.matchLocalPatterns(message);
    if (localResult) {
      return localResult;
    }

    // 3. 복잡한 명령어는 AI 처리 (성능 고려)
    if (this.isSettingsRelated(message)) {
      return await this.processWithAI(message);
    }

    return null; // 설정과 무관한 메시지
  }

  /**
   * 로컬 패턴 매칭 (빠른 처리)
   */
  private matchLocalPatterns(message: string): SettingsResponse | null {
    // 테마 변경
    for (const [theme, patterns] of Object.entries(this.SAFE_PATTERNS.theme)) {
      if (patterns.some(pattern => pattern.test(message))) {
        return {
          message: `${theme === 'light' ? '라이트' : theme === 'dark' ? '다크' : '자동'} 모드로 변경했습니다! ✨`,
          settingsAction: {
            type: 'theme',
            subtype: theme,
            value: theme,
            securityLevel: 'safe'
          }
        };
      }
    }

    // 언어 변경
    for (const [lang, patterns] of Object.entries(this.SAFE_PATTERNS.language)) {
      if (patterns.some(pattern => pattern.test(message))) {
        return {
          message: `언어를 ${lang === 'korean' ? '한국어' : '영어'}로 변경했습니다! 🌍`,
          settingsAction: {
            type: 'language',
            subtype: lang,
            value: lang === 'korean' ? 'ko' : 'en',
            securityLevel: 'safe'
          }
        };
      }
    }

    // 알림 설정
    for (const [setting, patterns] of Object.entries(this.SAFE_PATTERNS.notification)) {
      if (patterns.some(pattern => pattern.test(message))) {
        return {
          message: `알림을 ${setting === 'enable' ? '켰습니다' : '껐습니다'}! ${setting === 'enable' ? '🔔' : '🔕'}`,
          settingsAction: {
            type: 'notification',
            subtype: setting,
            value: setting === 'enable',
            securityLevel: 'safe'
          }
        };
      }
    }

    // 캘린더 보기 변경
    for (const [view, patterns] of Object.entries(this.SAFE_PATTERNS.calendar_view)) {
      if (patterns.some(pattern => pattern.test(message))) {
        return {
          message: `캘린더를 ${view === 'month' ? '월' : view === 'week' ? '주' : '일'} 보기로 변경했습니다! 📅`,
          settingsAction: {
            type: 'calendar_view',
            subtype: view,
            value: view,
            securityLevel: 'safe'
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
   * 설정 관련 메시지인지 확인
   */
  private isSettingsRelated(message: string): boolean {
    const settingsKeywords = [
      '설정', '바꿔', '변경', '조정', '수정',
      'setting', 'change', 'modify', 'adjust',
      '모드', 'mode', '테마', 'theme',
      '언어', 'language', '알림', 'notification'
    ];

    return settingsKeywords.some(keyword =>
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * 복잡한 설정 명령어 AI 처리 (비용 고려)
   */
  private async processWithAI(message: string): Promise<SettingsResponse> {
    try {
      // TODO: 경량화된 설정 전용 프롬프트 사용
      const prompt = `
다음 메시지에서 설정 변경 의도를 분석해주세요:
"${message}"

응답 형식:
{
  "isSettingsCommand": boolean,
  "settingType": "theme|language|notification|privacy|ui|calendar_view",
  "subtype": string,
  "value": any,
  "requiresConfirmation": boolean,
  "description": string
}

보안 규칙:
- 비밀번호, 계정 삭제, 관리자 권한 등은 거부
- 개인 설정(테마, 언어, 알림)만 허용
      `;

      // 실제로는 여기서 경량 AI 모델 호출
      // 현재는 시뮬레이션
      return {
        message: "설정 변경을 처리하고 있습니다... AI 처리가 필요한 복잡한 명령어입니다.",
        settingsAction: {
          type: 'ui',
          subtype: 'processing',
          value: null,
          securityLevel: 'medium',
          requiresConfirmation: true
        }
      };

    } catch (error) {
      return {
        message: "설정 변경 중 오류가 발생했습니다. 설정 메뉴를 직접 이용해주세요."
      };
    }
  }

  /**
   * 특별한 명령어들 (확인 필요)
   */
  async handleSpecialCommands(message: string): Promise<SettingsResponse | null> {
    const lowerMessage = message.toLowerCase();

    // 로그아웃 (확인 필요)
    if (/로그아웃|logout|로그.*아웃/.test(lowerMessage)) {
      return {
        message: "정말 로그아웃하시겠습니까? 저장되지 않은 작업이 있다면 사라질 수 있습니다.",
        settingsAction: {
          type: 'account',
          subtype: 'logout',
          value: true,
          requiresConfirmation: true,
          securityLevel: 'medium'
        },
        requiresConfirmation: true,
        suggestions: ["네, 로그아웃할게요", "아니요, 취소할게요"]
      };
    }

    // 계정 정보 확인 (안전)
    if (/계정.*정보|내.*정보|profile/.test(lowerMessage)) {
      return {
        message: "계정 정보를 확인하시겠어요? 프로필 페이지로 이동합니다.",
        settingsAction: {
          type: 'account',
          subtype: 'view_profile',
          value: true,
          securityLevel: 'safe'
        }
      };
    }

    return null;
  }
}

/**
 * 채팅 기반 설정 제어를 위한 확장된 ChatResponse
 */
export interface ExtendedChatResponse extends ChatResponse {
  settingsChanged?: boolean;
  requiresUIUpdate?: boolean;
  newSettings?: Record<string, any>;
}