import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { Task } from '../entities/Task';
import { ClockService } from '../clock/clock.service';

describe('TasksService', () => {
  let service: TasksService;
  let tasksRepository: { count: jest.Mock };
  let clock: { now: jest.Mock };

  beforeEach(async () => {
    tasksRepository = { count: jest.fn() };
    clock = { now: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(Task), useValue: tasksRepository },
        { provide: ClockService, useValue: clock },
      ],
    }).compile();

    service = module.get(TasksService);
  });

  it('counts rows via the repository, with no real database', async () => {
    tasksRepository.count.mockResolvedValue(15);
    clock.now.mockReturnValue(new Date('2026-09-09T00:00:00.000Z'));

    const result = await service.getDbHealth();

    expect(tasksRepository.count).toHaveBeenCalledWith();
    expect(result).toEqual({ count: 15, asOf: new Date('2026-09-09T00:00:00.000Z') });
  });

  it('reads the timestamp from whatever ClockService is injected', async () => {
    tasksRepository.count.mockResolvedValue(0);
    const fixedDate = new Date('2000-01-01T00:00:00.000Z');
    clock.now.mockReturnValue(fixedDate);

    const result = await service.getDbHealth();

    expect(result.asOf).toBe(fixedDate);
  });
});
