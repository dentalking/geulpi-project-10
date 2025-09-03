import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseKoreanDateTime } from './date-parser';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  public model: any;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async parseEventFromText(text: string) {
    // 먼저 한국어 날짜/시간 파싱 시도
    const parsedDateTime = parseKoreanDateTime(text);

    const prompt = `
      다음 텍스트에서 일정 정보를 추출해주세요.
      현재 날짜: ${new Date().toLocaleDateString('ko-KR')}
      
      JSON 형식으로 반환하되, 다음 필드를 포함해주세요:
      - title: 일정 제목 (구체적이고 명확하게)
      - date: 날짜 (YYYY-MM-DD, 기본값: ${parsedDateTime.date})
      - time: 시간 (HH:MM, 기본값: ${parsedDateTime.time})
      - duration: 소요 시간 (분 단위, 기본값: 60)
      - location: 장소 (optional)
      - description: 설명 (optional)
      - attendees: 참석자 이메일 배열 (optional)
      
      텍스트: ${text}
      
      JSON만 반환하고 다른 설명은 포함하지 마세요.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let jsonText = response.text();

      // JSON 추출
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const match = jsonText.match(/\{[\s\S]*\}/);
      if (match) {
        jsonText = match[0];
      }

      const eventData = JSON.parse(jsonText);

      // 기본값 적용
      if (!eventData.date) eventData.date = parsedDateTime.date;
      if (!eventData.time) eventData.time = parsedDateTime.time;
      if (!eventData.duration) eventData.duration = 60;
      if (!eventData.title) eventData.title = text; // 파싱 실패시 원본 텍스트 사용

      return eventData;
    } catch (error) {
      console.error('Gemini parsing error:', error);
      // 폴백: 기본 파싱
      return {
        title: text,
        date: parsedDateTime.date,
        time: parsedDateTime.time,
        duration: 60
      };
    }
  }

  async parseEventFromImage(imageBase64: string, mimeType: string = 'image/jpeg') {
    const prompt = `
      이 이미지에서 일정 정보를 추출해주세요.
      현재 날짜: ${new Date().toLocaleDateString('ko-KR')}
      
      JSON 형식으로 반환하되, 다음 필드를 포함해주세요:
      - title: 일정 제목
      - date: 날짜 (YYYY-MM-DD)
      - time: 시간 (HH:MM)
      - duration: 소요 시간 (분 단위, 기본값: 60)
      - location: 장소 (optional)
      - description: 설명 (optional)
      
      JSON만 반환하고 다른 설명은 포함하지 마세요.
    `;

    try {
      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType,
            data: imageBase64
          }
        }
      ]);

      const response = await result.response;
      let jsonText = response.text();

      // JSON 추출
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const match = jsonText.match(/\{[\s\S]*\}/);
      if (match) {
        jsonText = match[0];
      }

      return JSON.parse(jsonText);
    } catch (error) {
      console.error('Gemini image parsing error:', error);
      throw error;
    }
  }

  async generateEventBriefing(event: any) {
    const eventDate = new Date(event.start?.dateTime || event.start?.date);
    const now = new Date();
    const hoursUntil = Math.round((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60));

    const prompt = `
      다음 일정에 대한 실용적인 브리핑을 작성해주세요:
      
      제목: ${event.summary}
      시간: ${eventDate.toLocaleString('ko-KR')}
      장소: ${event.location || '미정'}
      설명: ${event.description || '없음'}
      참석자: ${event.attendees?.map((a: any) => a.email).join(', ') || '없음'}
      남은 시간: 약 ${hoursUntil}시간
      
      다음을 포함해주세요:
      1. 📅 일정 요약 (한 문장)
      2. ✅ 준비사항 체크리스트 (구체적으로)
      3. 🚗 이동 관련 팁 (장소가 있다면)
      4. 💡 유용한 조언
      5. ⏰ 추천 출발 시간
      
      간결하고 실용적으로, 이모지를 활용해서 읽기 쉽게 작성해주세요.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Briefing generation error:', error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();