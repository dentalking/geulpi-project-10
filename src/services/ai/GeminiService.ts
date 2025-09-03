import { GoogleGenerativeAI, GenerativeModel, GenerateContentResponse } from '@google/generative-ai';
import { parseKoreanDateTime } from '@/lib/date-parser';
import type { EventData, ImageParseResult } from '@/types';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  public model: GenerativeModel; // public으로 변경하여 접근 가능하게 함

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash" 
    });
  }

  /**
   * 텍스트에서 일정 정보 추출
   */
  async parseEventFromText(text: string): Promise<EventData> {
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
      const response = result.response;
      let jsonText = response.text();

      // JSON 추출
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      const parsedData = JSON.parse(jsonText);

      return {
        title: parsedData.title || '새 일정',
        date: parsedData.date || parsedDateTime.date,
        time: parsedData.time || parsedDateTime.time,
        duration: parsedData.duration || 60,
        location: parsedData.location,
        description: parsedData.description,
        attendees: parsedData.attendees || []
      };
    } catch (error) {
      console.error('Error parsing event from text:', error);
      
      // 오류 시 기본값 반환
      return {
        title: text.substring(0, 50),
        date: parsedDateTime.date,
        time: parsedDateTime.time,
        duration: 60
      };
    }
  }

  /**
   * 이미지에서 일정 정보 추출
   */
  async parseEventFromImage(imageData: string, mimeType: string): Promise<ImageParseResult> {
    const prompt = `
      이 이미지에서 일정 또는 이벤트 정보를 추출해주세요.
      
      JSON 형식으로 반환하되, 다음 필드를 포함해주세요:
      - title: 이벤트 제목
      - date: 날짜 (YYYY-MM-DD 형식)
      - time: 시간 (HH:MM 형식)
      - duration: 예상 소요 시간(분)
      - location: 장소
      - description: 설명
      - confidence: 추출 신뢰도 (0-1)
      - extractedText: 이미지에서 추출한 텍스트
      
      JSON만 반환하고 다른 설명은 포함하지 마세요.
    `;

    try {
      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageData,
            mimeType
          }
        }
      ]);

      const response = result.response;
      let jsonText = response.text();

      // JSON 추출
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      const parsedData = JSON.parse(jsonText);

      return {
        title: parsedData.title || '추출된 일정',
        date: parsedData.date || new Date().toISOString().split('T')[0],
        time: parsedData.time || '09:00',
        duration: parsedData.duration || 60,
        location: parsedData.location,
        description: parsedData.description,
        confidence: parsedData.confidence || 0.5,
        extractedText: parsedData.extractedText
      };
    } catch (error) {
      console.error('Error parsing event from image:', error);
      throw new Error('이미지 처리 중 오류가 발생했습니다');
    }
  }

  /**
   * 대화형 응답 생성
   */
  async generateResponse(prompt: string, context?: any): Promise<string> {
    try {
      const fullPrompt = context 
        ? `컨텍스트: ${JSON.stringify(context)}\n\n${prompt}`
        : prompt;

      const result = await this.model.generateContent(fullPrompt);
      return result.response.text();
    } catch (error) {
      console.error('Error generating response:', error);
      throw new Error('응답 생성 중 오류가 발생했습니다');
    }
  }

  /**
   * 자연어 처리 (NLP 파이프라인용)
   */
  async processNaturalLanguage(text: string): Promise<any> {
    const prompt = `
      다음 텍스트를 분석하여 의도와 엔티티를 추출해주세요:
      
      텍스트: "${text}"
      
      JSON 형식으로 반환:
      {
        "intent": "CREATE_EVENT|SEARCH_EVENTS|UPDATE_EVENT|DELETE_EVENT|GET_BRIEFING|CONVERSATION",
        "entities": [
          {
            "type": "date|time|duration|location|person|event_type",
            "value": "추출된 값",
            "normalized": "정규화된 값"
          }
        ],
        "confidence": 0.0-1.0
      }
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Failed to parse NLP response');
    } catch (error) {
      console.error('Error in NLP processing:', error);
      return {
        intent: 'CONVERSATION',
        entities: [],
        confidence: 0.5
      };
    }
  }

  /**
   * 텍스트에서 이벤트 생성 (NLP 파이프라인용)
   */
  async generateEventFromText(text: string): Promise<EventData> {
    return this.parseEventFromText(text);
  }

  /**
   * 일반 메시지 처리
   */
  async processMessage(message: string, context?: any): Promise<string> {
    return this.generateResponse(message, context);
  }
}

export default GeminiService;
export const geminiService = new GeminiService();