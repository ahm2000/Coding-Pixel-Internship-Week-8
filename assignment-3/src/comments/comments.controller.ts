import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Comment } from '../entities/Comment';
import { Paginated } from '../common/pagination';
import { PaginationQueryDto } from '../common/pagination-query.dto';

@Controller('tasks/:taskId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  create(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: CreateCommentDto,
  ): Promise<Comment> {
    return this.commentsService.addComment(taskId, dto);
  }

  @Get()
  findAll(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Query() pagination: PaginationQueryDto,
  ): Promise<Paginated<Comment>> {
    return this.commentsService.findByTask(taskId, pagination);
  }
}
