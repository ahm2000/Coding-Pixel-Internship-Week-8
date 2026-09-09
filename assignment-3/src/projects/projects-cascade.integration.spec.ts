import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../app.module';
import { User } from '../entities/User';
import { Project } from '../entities/Project';
import { Task } from '../entities/Task';
import { Comment } from '../entities/Comment';
import { ProjectsService } from './projects.service';

describe('Project delete cascade (C2, integration)', () => {
  let app: INestApplication;
  let usersRepository: Repository<User>;
  let projectsRepository: Repository<Project>;
  let tasksRepository: Repository<Task>;
  let commentsRepository: Repository<Comment>;
  let projectsService: ProjectsService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    usersRepository = moduleRef.get(getRepositoryToken(User));
    projectsRepository = moduleRef.get(getRepositoryToken(Project));
    tasksRepository = moduleRef.get(getRepositoryToken(Task));
    commentsRepository = moduleRef.get(getRepositoryToken(Comment));
    projectsService = moduleRef.get(ProjectsService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('removes a project, its tasks, and their comments together', async () => {
    const owner = await usersRepository.save(
      usersRepository.create({ name: 'Cascade Owner', email: `cascade-${Date.now()}@example.com` }),
    );
    const project = await projectsRepository.save(
      projectsRepository.create({ name: `Cascade Project ${Date.now()}`, owner }),
    );
    const task = await tasksRepository.save(
      tasksRepository.create({ title: 'Cascade task', project }),
    );
    const comment = await commentsRepository.save(
      commentsRepository.create({ body: 'Cascade comment', task, author: owner }),
    );

    await projectsService.remove(project.id);

    expect(await tasksRepository.findOneBy({ id: task.id })).toBeNull();
    expect(await commentsRepository.findOneBy({ id: comment.id })).toBeNull();
    expect(await projectsRepository.findOneBy({ id: project.id })).toBeNull();

    await usersRepository.delete({ id: owner.id });
  });
});
