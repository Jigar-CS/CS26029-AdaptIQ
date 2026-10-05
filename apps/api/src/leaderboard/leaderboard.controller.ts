import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  async getLeaderboard(@Request() req: any, @Query() query: LeaderboardQueryDto) {
    return this.leaderboardService.getLeaderboard(req.user.id, query);
  }
}
