import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../entities/Task';
import { ClockModule } from '../clock/clock.module';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Task]), ClockModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
