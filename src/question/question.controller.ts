import { Controller, Post, Body, Get, Param, UseGuards, Request, UnauthorizedException, UploadedFile, UseInterceptors, Delete } from '@nestjs/common';
import { QuestionService } from './question.service';
import { Question } from '../schemas/question.schema';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { SubProjectService } from 'src/subproject/subproject.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('questions')
export class QuestionController {
  constructor(private questionService: QuestionService, private subProjectService: SubProjectService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req, @Body() body: { text: string; subProjectId: string, projectId: string, file: Express.Multer.File }): Promise<Question> {
    return this.questionService.create(req.user._id, body.text, body.subProjectId, body.projectId, body.file);
  }

  @UseGuards(JwtAuthGuard)
  @Get('subproject/:subProjectId')
  async findBySubProject(@Request() req, @Param('subProjectId') subProjectId: string): Promise<Question[]> {
    return this.questionService.findBySubProject(subProjectId, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/answer')
  async answer(@Request() req, @Param('id') id: string, @Body() body: { answer: string }): Promise<Question> {
    if (req.user.role !== 'admin' && req.user.role !== 'superAdmin') throw new UnauthorizedException('Admins only');
    return this.questionService.answer(id, { answeredBy: req.user.email, text: body.answer, answeredAt: new Date(), name: req.user.firstName + ' ' + req.user.lastName });
  }

  @UseGuards(JwtAuthGuard)
  @Get('alerts')
  async findAlerts(@Request() req): Promise<Question[]> {
    if (req.user.role !== 'admin' && req.user.role !== 'superAdmin') throw new UnauthorizedException('Admins only');
    return this.questionService.findAdminAlerts();
  }

  @UseGuards(JwtAuthGuard)
  @Get('bulletins/:subProjectId')
  async getAllBulletins(@Request() req, @Param('subProjectId') subProjectId: string): Promise<Question[]> {
    return this.questionService.getAllBulletins(subProjectId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('createBulletin')
  async createBulletin(@Request() req, @Body() body: { id: string }): Promise<Question> {
    return this.questionService.createBulletin(req.user._id, body.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('deleteBulletin/:id')
  async deleteBulletin(@Request() req, @Param('id') id: string): Promise<void> {
    return this.questionService.deletebulletin(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('deleteQuestion/:subProjectId/:questionId')
  async deleteQuestion(@Request() req, @Param('subProjectId') subProjectId: string, @Param('questionId') questionId: string): Promise<void> {
    return this.questionService.deleteQuestion(subProjectId, questionId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('uploadQuestionFile')
  @UseInterceptors(FileInterceptor('file'))
  async uploadQuestionFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Request() req
  ): Promise<Question> {
    return this.questionService.create(req.user._id, body.text, body.subProjectId, body.projectId, file)
  }
}