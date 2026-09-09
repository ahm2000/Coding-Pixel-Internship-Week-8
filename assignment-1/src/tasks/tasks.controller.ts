import { Controller, Get } from '@nestjs/common';
import { TasksService, TaskDbHealth } from './tasks.service';

@Controller('health')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('db')
  getDbHealth(): Promise<TaskDbHealth> {
    return this.tasksService.getDbHealth();
  }
}
