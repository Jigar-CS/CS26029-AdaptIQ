import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('courses')
export class CoursesController {
  constructor(private coursesService: CoursesService) {}

  @Get()
  async getCourses() {
    return this.coursesService.getAllCourses();
  }

  @Get(':id')
  async getCourse(@Param('id') id: string) {
    return this.coursesService.getCourseById(id);
  }

  @Get(':id/questions')
  async getCourseQuestions(@Param('id') id: string) {
    return this.coursesService.getCourseQuestions(id);
  }
}
