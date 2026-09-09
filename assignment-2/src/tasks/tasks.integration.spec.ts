import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from '../common/all-exceptions.filter';
import { Project } from '../entities/Project';
import { User } from '../entities/User';
import { Task } from '../entities/Task';

describe('Tasks (integration)', () => {
  let app: INestApplication;
  let usersRepository: Repository<User>;
  let projectsRepository: Repository<Project>;
  let tasksRepository: Repository<Task>;
  let projectId: number;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    usersRepository = moduleRef.get(getRepositoryToken(User));
    projectsRepository = moduleRef.get(getRepositoryToken(Project));
    tasksRepository = moduleRef.get(getRepositoryToken(Task));

    const owner = await usersRepository.save(
      usersRepository.create({
        name: 'Integration Test Owner',
        email: `owner-${Date.now()}@example.com`,
      }),
    );
    const project = await projectsRepository.save(
      projectsRepository.create({ name: `Integration Test Project ${Date.now()}`, owner }),
    );
    projectId = project.id;
  });

  afterAll(async () => {
    await tasksRepository.delete({ project: { id: projectId } });
    await projectsRepository.delete({ id: projectId });
    await app.close();
  });

  it('creates a task then reads it back with its relations loaded (happy path)', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/tasks')
      .send({ title: 'Write the integration test', projectId })
      .expect(201);

    expect(createResponse.body.title).toBe('Write the integration test');
    expect(createResponse.body.project).toMatchObject({ id: projectId });
    const taskId = createResponse.body.id;

    const getResponse = await request(app.getHttpServer()).get(`/tasks/${taskId}`).expect(200);

    expect(getResponse.body.id).toBe(taskId);
    expect(getResponse.body.project).toMatchObject({ id: projectId });
    expect(getResponse.body).toHaveProperty('assignee');
    expect(getResponse.body).toHaveProperty('tags');
  });

  it('rejects a title shorter than 3 characters with 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/tasks')
      .send({ title: 'ab', projectId })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
    expect(String(response.body.message)).toMatch(/title/i);
  });

  it('returns 404 for an unknown task id', async () => {
    const response = await request(app.getHttpServer()).get('/tasks/999999999').expect(404);

    expect(response.body.statusCode).toBe(404);
    expect(response.body.path).toBe('/tasks/999999999');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('rejects a body with an unknown extra field with 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/tasks')
      .send({ title: 'Valid title', projectId, notARealField: 'nope' })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
  });

  it('deletes a task, returning 204, then 404 on a second delete', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/tasks')
      .send({ title: 'Task to delete', projectId })
      .expect(201);
    const taskId = createResponse.body.id;

    const deleteResponse = await request(app.getHttpServer()).delete(`/tasks/${taskId}`).expect(204);
    expect(deleteResponse.body).toEqual({});

    await request(app.getHttpServer()).delete(`/tasks/${taskId}`).expect(404);
  });
});
