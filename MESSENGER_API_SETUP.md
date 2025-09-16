# 메신저 플랫폼 API 설정 가이드

## 🔧 환경변수 설정

### .env.local 파일에 추가해야 할 키들

```bash
# 카카오톡 봇 API
KAKAO_BOT_SECRET=your_kakao_bot_secret_key

# Discord 봇 API
DISCORD_PUBLIC_KEY=your_discord_public_key
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_APPLICATION_ID=your_discord_app_id

# 기존 키들 (이미 설정됨)
GOOGLE_API_KEY=your_google_maps_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
```

## 📱 카카오톡 봇 설정

### 1. 카카오 비즈니스 채널 생성
1. [카카오 비즈니스](https://business.kakao.com/) 접속
2. '채널 만들기' → 비즈니스 정보 입력
3. 채널 승인 대기 (보통 1-3일)

### 2. 챗봇 API 신청
1. 카카오 비즈니스 관리자센터 → '챗봇'
2. 'API형 챗봇' 선택
3. Webhook URL 설정: `https://yourdomain.com/api/kakao/webhook`
4. 시나리오 설정 완료

### 3. API 키 확인
```javascript
// src/app/api/kakao/webhook/route.ts
const botSecret = process.env.KAKAO_BOT_SECRET; // 이 값 설정 필요
```

### 4. 테스트 방법
- 카카오톡에서 채널 검색
- 친구 추가 후 메시지 전송
- "안녕" 입력 시 응답 확인

## 🎮 Discord 봇 설정

### 1. Discord 애플리케이션 생성
1. [Discord Developer Portal](https://discord.com/developers/applications) 접속
2. 'New Application' → 애플리케이션 이름 입력
3. 'Bot' 탭 → 'Add Bot' 클릭

### 2. 토큰 및 키 확인
```javascript
// General Information 탭
APPLICATION_ID: "123456789012345678"
PUBLIC_KEY: "abcdef1234567890abcdef1234567890abcdef12"

// Bot 탭
TOKEN: "MTIzNDU2Nzg5MDEyMzQ1Njc4.GaBcDe.xyz123..."
```

### 3. Slash Commands 등록
```bash
# Discord API를 통해 명령어 등록
curl -X POST \
  "https://discord.com/api/v10/applications/{APPLICATION_ID}/commands" \
  -H "Authorization: Bot {BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "schedule",
    "description": "새 일정 추가",
    "options": [
      {
        "name": "title",
        "description": "일정 제목",
        "type": 3,
        "required": true
      },
      {
        "name": "datetime",
        "description": "날짜 및 시간",
        "type": 3,
        "required": true
      }
    ]
  }'
```

### 4. Webhook 설정
1. General Information → Interactions Endpoint URL
2. URL: `https://yourdomain.com/api/discord/webhook`
3. 'Save Changes' 클릭

### 5. 서버 초대
1. OAuth2 → URL Generator
2. Scopes: `bot`, `applications.commands`
3. Bot Permissions: `Send Messages`, `Use Slash Commands`
4. 생성된 URL로 서버 초대

## 🔒 보안 설정

### 서명 검증 활성화

현재 개발 모드에서는 비활성화되어 있음:

```javascript
// 카카오톡 (현재 상태)
if (process.env.NODE_ENV === 'production' && signature) {
  if (!verifySignature(bodyText, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
}

// Discord (현재 상태)
if (process.env.NODE_ENV === 'production' && signature && timestamp) {
  if (!verifyDiscordSignature(bodyText, signature, timestamp)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
}
```

## 🚀 배포 체크리스트

### 배포 전 필수 작업

- [ ] 카카오 비즈니스 채널 승인 완료
- [ ] Discord 애플리케이션 생성 완료
- [ ] 모든 환경변수 설정 완료
- [ ] HTTPS 도메인 준비 (Webhook 필수)
- [ ] Webhook URL 각 플랫폼에 등록

### 테스트 시나리오

1. **카카오톡 테스트**
   ```
   사용자: "안녕"
   봇: 인사 메시지 + 버튼 메뉴

   사용자: "김철수와 내일 3시 강남역에서 만나기"
   봇: 약속 제안 확인 메시지
   ```

2. **Discord 테스트**
   ```
   사용자: /help
   봇: 도움말 임베드 메시지

   사용자: /schedule title:"팀 미팅" datetime:"내일 2시"
   봇: 일정 생성 확인 (비가입자는 연결 안내)
   ```

## 📊 모니터링

### 로그 확인점
- Webhook 요청 수신 로그
- 서명 검증 성공/실패
- 메시지 처리 성공/실패
- 사용자 등록/게스트 처리

### 대시보드 메트릭
```javascript
// 추천 모니터링 항목
- 일일 활성 사용자 수 (DAU)
- 플랫폼별 메시지 처리량
- 응답 시간 (평균/최대)
- 에러율 (카카오/Discord 분리)
```

## 🆘 문제 해결

### 자주 발생하는 이슈

1. **카카오톡 봇 응답 없음**
   - Webhook URL HTTPS 확인
   - 카카오 서버 IP 화이트리스트 확인
   - 봇 시나리오 활성화 상태 점검

2. **Discord 명령어 인식 안됨**
   - Slash Command 등록 확인
   - 봇 권한 설정 점검
   - Application ID 일치 여부 확인

3. **서명 검증 실패**
   - 환경변수 값 정확성 확인
   - 타임스탬프 동기화 문제 점검
   - 요청 body 인코딩 확인

### 디버깅 도구
```bash
# 카카오톡 Webhook 테스트
curl -X POST http://localhost:3000/api/kakao/webhook \
  -H "Content-Type: application/json" \
  -d '{"user_key":"test","type":"text","content":"안녕"}'

# Discord Webhook 테스트
curl -X POST http://localhost:3000/api/discord/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":1}'
```

## 💡 개발 팁

1. **단계적 배포**
   - 먼저 테스트 채널/서버에서 검증
   - 소수 사용자 대상 베타 테스트
   - 점진적 사용자 확대

2. **백업 계획**
   - Webhook 장애 시 폴백 메커니즘
   - 메시지 큐를 통한 재시도 로직
   - 다중 Webhook URL 설정

3. **사용자 경험**
   - 응답 시간 최적화 (3초 이내)
   - 친근한 에러 메시지
   - 다양한 명령어 패턴 지원