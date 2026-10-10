import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async getAllCourses() {
    return this.prisma.course.findMany({
      include: {
        topics: {
          select: {
            id: true,
            name: true,
            slug: true,
            _count: {
              select: { questions: true },
            },
          },
        },
        _count: {
          select: { questions: true },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async getCourseById(id: string) {
    return this.prisma.course.findUnique({
      where: { id },
      include: {
        topics: true,
      },
    });
  }

  async getCourseQuestions(courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        OR: [
          { id: courseId },
          { code: courseId },
          { code: courseId.toUpperCase() },
        ],
      },
    });
    const targetId = course ? course.id : courseId;

    return this.prisma.question.findMany({
      where: {
        OR: [{ courseId: targetId }, { courseId }, { topic: { courseId: targetId } }],
      },
      include: {
        topic: true,
        options: {
          include: { misconception: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
