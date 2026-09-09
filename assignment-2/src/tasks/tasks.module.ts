import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../entities/Task';
import { Tag } from '../entities/Tag';
import { UsersModule } from '../users/users.module';
import { ProjectsModule } from '../projects/projects.module';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Task, Tag]), UsersModule, ProjectsModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
