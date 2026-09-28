import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiClientService {
  private readonly logger = new Logger('AiClientService');
  private readonly aiBaseUrl: string;

  constructor(private configService: ConfigService) {
    this.aiBaseUrl = this.configService.get<string>('AI_SERVICE_URL') || 'http://localhost:8000';
  }

  /**
   * Health probe to check if Python AI microservice is responsive
   */
  async isAiServiceHealthy(): Promise<boolean> {
    try {
      const res = await fetch(`${this.aiBaseUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(1500),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Dispatches Socratic analysis request to FastAPI microservice
   */
  async requestSocraticRemediation(payload: {
    questionText: string;
    topic: string;
    courseCode: string;
    studentSelectedOption: string;
    correctOption: string;
    explanation: string;
  }) {
    try {
      const res = await fetch(`${this.aiBaseUrl}/api/v1/ai/socratic-remediation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text: payload.questionText,
          topic: payload.topic,
          course_code: payload.courseCode,
          student_selected_option: payload.studentSelectedOption,
          correct_option: payload.correctOption,
          explanation: payload.explanation,
        }),
        signal: AbortSignal.timeout(3000),
      });

      if (!res.ok) {
        throw new Error(`AI microservice returned HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err: any) {
      this.logger.warn(`FastAPI Socratic service unavailable (${err.message}). Using local pedagogical engine.`);
      return null;
    }
  }

  /**
   * Dispatches conversational Socratic action to FastAPI microservice
   */
  async requestSocraticChat(payload: {
    topic: string;
    courseCode: string;
    questionText: string;
    userMessage: string;
    actionType: string;
    conversationHistory?: any[];
  }) {
    try {
      const res = await fetch(`${this.aiBaseUrl}/api/v1/ai/socratic-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: payload.topic,
          course_code: payload.courseCode,
          question_text: payload.questionText,
          user_message: payload.userMessage,
          action_type: payload.actionType,
          conversation_history: payload.conversationHistory || [],
        }),
        signal: AbortSignal.timeout(3000),
      });

      if (!res.ok) {
        throw new Error(`AI microservice returned HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err: any) {
      this.logger.warn(`FastAPI Chat unavailable (${err.message}). Using local Socratic logic.`);
      return null;
    }
  }
}
