import { GoogleGenerativeAI, GenerativeModel, GenerateContentResponse } from '@google/generative-ai';
import { parseKoreanDateTime } from '@/lib/date-parser';
import type { EventData, ImageParseResult } from '@/types';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  public model: GenerativeModel; // public으로 변경하여 접근 가능하게 함

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('GeminiService constructor - API Key exists:', !!apiKey);
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
   * 이미지에서 일정 정보 추출 (개선된 파싱 및 검증)
   */
  async parseEventFromImage(imageData: string, mimeType: string): Promise<ImageParseResult> {
    const currentDate = new Date();
    const defaultDate = currentDate.toISOString().split('T')[0];
    const defaultTime = '09:00';
    
    const prompt = `
      이 이미지에서 일정 또는 이벤트 정보를 추출해주세요.
      현재 날짜: ${defaultDate}
      
      반드시 유효한 JSON 형식으로만 반환하세요. 다음 필드를 포함해주세요:
      {
        "title": "이벤트 제목 (필수)",
        "date": "YYYY-MM-DD 형식의 날짜 (필수, 확실하지 않으면 ${defaultDate})",
        "time": "HH:MM 형식의 시간 (필수, 확실하지 않으면 ${defaultTime})",
        "duration": 예상 소요 시간(분, 숫자, 기본값 60),
        "location": "장소 (선택사항)",
        "description": "설명 (선택사항)",
        "confidence": 추출 신뢰도 (0-1 사이의 숫자),
        "extractedText": "이미지에서 추출한 주요 텍스트"
      }
      
      **중요**: 
      1. JSON만 반환하고, 코드 블록 마커나 다른 설명은 절대 포함하지 마세요.
      2. 날짜와 시간은 반드시 유효한 형식이어야 합니다.
      3. 확실하지 않은 정보는 기본값을 사용하세요.
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
      
      console.log('Raw Gemini response (first 500 chars):', jsonText.substring(0, 500));

      // Aggressive cleanup
      // Remove all markdown code blocks
      jsonText = jsonText.replace(/```[\s\S]*?```/g, (match) => {
        const content = match.replace(/```json\s*|```\s*/g, '');
        return content;
      });
      
      // Remove any remaining backticks
      jsonText = jsonText.replace(/`/g, '');
      
      // Try to find JSON object with multiple patterns
      let jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Try to find anything that looks like JSON
        const startIdx = jsonText.indexOf('{');
        const endIdx = jsonText.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          jsonText = jsonText.substring(startIdx, endIdx + 1);
        }
      } else {
        jsonText = jsonMatch[0];
      }

      console.log('Cleaned JSON text:', jsonText);

      let parsedData;
      try {
        parsedData = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('JSON parse error, attempting regex extraction:', parseError);
        
        // Enhanced fallback with multiple extraction patterns
        const extractField = (fieldName: string): string | undefined => {
          // Try different regex patterns
          const patterns = [
            new RegExp(`"${fieldName}"\\s*:\\s*"([^"]*)"`, 'i'),
            new RegExp(`'${fieldName}'\\s*:\\s*'([^']*)'`, 'i'),
            new RegExp(`${fieldName}\\s*:\\s*"([^"]*)"`, 'i'),
            new RegExp(`${fieldName}\\s*:\\s*'([^']*)'`, 'i')
          ];
          
          for (const pattern of patterns) {
            const match = jsonText.match(pattern);
            if (match && match[1]) {
              return match[1];
            }
          }
          return undefined;
        };
        
        const extractNumber = (fieldName: string): number => {
          const patterns = [
            new RegExp(`"${fieldName}"\\s*:\\s*(\\d+)`, 'i'),
            new RegExp(`'${fieldName}'\\s*:\\s*(\\d+)`, 'i'),
            new RegExp(`${fieldName}\\s*:\\s*(\\d+)`, 'i')
          ];
          
          for (const pattern of patterns) {
            const match = jsonText.match(pattern);
            if (match && match[1]) {
              return parseInt(match[1], 10);
            }
          }
          return fieldName === 'duration' ? 60 : 0;
        };
        
        parsedData = {
          title: extractField('title') || '이미지에서 추출된 일정',
          date: extractField('date') || defaultDate,
          time: extractField('time') || defaultTime,
          duration: extractNumber('duration'),
          location: extractField('location'),
          description: extractField('description') || extractField('desc'),
          confidence: 0.3, // Lower confidence for regex extraction
          extractedText: jsonText.substring(0, 500)
        };
      }

      // Validate and clean extracted data
      const validateDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          console.warn(`Invalid date "${dateStr}", using default`);
          return defaultDate;
        }
        return dateStr;
      };

      const validateTime = (timeStr: string): string => {
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
        if (!timeRegex.test(timeStr)) {
          console.warn(`Invalid time "${timeStr}", using default`);
          return defaultTime;
        }
        return timeStr;
      };

      // Ensure required fields and validate
      const finalResult: ImageParseResult = {
        title: parsedData.title || '추출된 일정',
        date: validateDate(parsedData.date || defaultDate),
        time: validateTime(parsedData.time || defaultTime),
        duration: Math.max(15, Math.min(480, parsedData.duration || 60)), // Clamp between 15 min and 8 hours
        location: parsedData.location,
        description: parsedData.description,
        confidence: Math.max(0, Math.min(1, parsedData.confidence || 0.5)),
        extractedText: parsedData.extractedText
      };

      // Final validation
      if (!finalResult.title || finalResult.title.trim() === '') {
        throw new Error('제목을 추출할 수 없습니다');
      }

      console.log('Extracted event data:', finalResult);
      return finalResult;
      
    } catch (error) {
      console.error('Error parsing event from image:', error);
      
      // Return minimal valid data as last resort
      return {
        title: '이미지 일정',
        date: defaultDate,
        time: defaultTime,
        duration: 60,
        description: '이미지에서 자동 추출된 일정입니다',
        confidence: 0.1,
        extractedText: '추출 실패'
      };
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