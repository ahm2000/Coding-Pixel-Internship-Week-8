import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../entities/Task';
import { ClockService } from '../clock/clock.service';

export interface TaskDbHealth {
  count: number;
  asOf: Date;
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly tasksRepository: Repository<Task>,
    private readonly clock: ClockService,
  ) {}

  async getDbHealth(): Promise<TaskDbHealth> {
    const count = await this.tasksRepository.count();
    return { count, asOf: this.clock.now() };
  }
}
