import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { CompanionSyncService } from './companion-sync.service';

@Controller('companion')
export class CompanionController {
  constructor(private readonly companionSync: CompanionSyncService) {}

  @Get('status')
  getStatus(@Query('sessionId') sessionId = 'clias-session-default') {
    const pairing = this.companionSync.getPairingInfo(sessionId);
    return {
      mobileConnected: this.companionSync.isMobileConnected(sessionId),
      isSubmitted: pairing ? pairing.isSubmitted : this.companionSync.isSessionSubmitted(sessionId),
      activeQuestionId: this.companionSync.getActiveQuestion(sessionId),
      localIp: this.companionSync.getLocalIp(),
      publicHost: process.env.RENDER_EXTERNAL_HOSTNAME || process.env.PUBLIC_API_HOST || null,
      port: 4000,
      pairing: pairing || null,
    };
  }

  @Get('pairing/verify')
  verifyPairing(@Query('pin') pin: string) {
    const pairing = this.companionSync.getPairingInfo(pin);
    return {
      valid: Boolean(pairing && !pairing.isSubmitted),
      pairing: pairing || null,
    };
  }

  @Post('register-questions')
  registerQuestions(@Body() body: { sessionId?: string; questions: any[] }) {
    const sId = body.sessionId || 'clias-session-9842';
    return this.companionSync.registerSessionQuestions(sId, body.questions || []);
  }

  @Get('questions')
  getQuestions(@Query('sessionId') sessionId = 'clias-session-default') {
    return this.companionSync.getSessionQuestions(sessionId);
  }

  @Post('reset')
  resetSession(@Query('sessionId') sessionId = 'clias-session-default') {
    return this.companionSync.resetSession(sessionId);
  }

  @Get('strokes')
  getStrokes(
    @Query('sessionId') sessionId = 'clias-session-default',
    @Query('questionId') questionId = 'Q1',
  ) {
    return this.companionSync.getStrokes(sessionId, questionId);
  }

  @Post('strokes')
  saveStrokes(
    @Query('sessionId') sessionId = 'clias-session-default',
    @Body() body: { sessionId?: string; questionId?: string; strokes: any[] },
  ) {
    const sId = body.sessionId || sessionId;
    const qId = (body.questionId || 'Q1').toUpperCase();
    return this.companionSync.saveStrokes(sId, qId, body.strokes || []);
  }

  @Post('switch-question')
  switchQuestion(
    @Query('sessionId') sessionId = 'clias-session-default',
    @Query('questionId') questionId = 'Q1',
  ) {
    return this.companionSync.switchActiveQuestion(sessionId, questionId);
  }

  @Post('clear')
  clearCanvas(
    @Query('sessionId') sessionId = 'clias-session-default',
    @Query('questionId') questionId = 'Q1',
  ) {
    return this.companionSync.clearCanvas(sessionId, questionId);
  }

  @Post('submit')
  submitExam(
    @Query('sessionId') sessionId = 'clias-session-default',
    @Query('submissionId') querySubId?: string,
    @Body() body?: { submissionId?: string },
  ) {
    const subId = querySubId || body?.submissionId;
    return this.companionSync.submitExamAndGenerateExitPass(sessionId, subId);
  }

  @Get('verify-exit-pass')
  verifyExitPass(
    @Query('sessionId') sessionId = 'clias-session-default',
    @Query('pass') pass: string,
  ) {
    const valid = this.companionSync.verifyExitPass(sessionId, pass);
    return { valid };
  }
}
