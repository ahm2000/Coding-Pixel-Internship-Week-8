import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/User';
import { Project } from './entities/Project';
import { ProjectMember } from './entities/ProjectMember';
import { Task } from './entities/Task';
import { Tag } from './entities/Tag';
import { Comment } from './entities/Comment';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        synchronize: false,
        entities: [User, Project, ProjectMember, Task, Tag, Comment],
      }),
    }),
    UsersModule,
    ProjectsModule,
    TasksModule,
  ],
})
export class AppModule {}
