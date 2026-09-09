import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { Task } from '../entities/Task';
import { Project } from '../entities/Project';
import { User } from '../entities/User';
import { Tag } from '../entities/Tag';

describe('TasksService', () => {
  let service: TasksService;
  let queryBuilder: {
    leftJoinAndSelect: jest.Mock;
    addSelect: jest.Mock;
    where: jest.Mock;
    getRawAndEntities: jest.Mock;
  };
  let tasksRepository: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawAndEntities: jest.fn(),
    };
    tasksRepository = { createQueryBuilder: jest.fn(() => queryBuilder) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(Task), useValue: tasksRepository },
        { provide: getRepositoryToken(Project), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(Tag), useValue: {} },
      ],
    }).compile();

    service = module.get(TasksService);
  });

  // X1: the repository is mocked to return a known row, and the test
  // checks the service maps the raw subquery result into the response
  // shape correctly. What this mock could lie about: Postgres always
  // returns COUNT(*) as a string, never a number — a mock that returned
  // `commentCount: 5` (already a number) would hide a real bug where the
  // service forgot the `Number(...)` conversion, since a string "5" would
  // still look right in a shallow equality check against another string.
  // Using the string form here is what actually exercises that line.
  it('maps the raw comment-count subquery into a numeric commentCount field', async () => {
    const rawTask = { id: 1, title: 'Ship the feature' } as Task;
    queryBuilder.getRawAndEntities.mockResolvedValue({
      entities: [rawTask],
      raw: [{ commentCount: '5' }],
    });

    const result = await service.findOne(1);

    expect(queryBuilder.where).toHaveBeenCalledWith('task.id = :id', { id: 1 });
    expect(result.commentCount).toBe(5);
    expect(typeof result.commentCount).toBe('number');
  });

  it('rejects with 404 when no row matches the id', async () => {
    queryBuilder.getRawAndEntities.mockResolvedValue({ entities: [], raw: [] });

    await expect(service.findOne(999)).rejects.toThrow('Task 999 not found');
  });
});
