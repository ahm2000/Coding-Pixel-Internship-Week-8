import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envValidationSchema } from './config/env.validation';
import { User } from './entities/User';
import { Project } from './entities/Project';
import { ProjectMember } from './entities/ProjectMember';
import { Task } from './entities/Task';
import { Tag } from './entities/Tag';
import { Comment } from './entities/Comment';
import { TasksModule } from './tasks/tasks.module';
import { PingModule } from './ping/ping.module';
import { PongModule } from './pong/pong.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
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
    TasksModule,
    PingModule,
    PongModule,
  ],
})
export class AppModule {}
