import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { Comment } from '../entities/Comment';
import { Task } from '../entities/Task';
import { User } from '../entities/User';

describe('CommentsService', () => {
  let service: CommentsService;
  let commentsRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findAndCount: jest.Mock;
  };
  let tasksRepository: { findOneBy: jest.Mock };
  let usersRepository: { findOneBy: jest.Mock };

  beforeEach(async () => {
    commentsRepository = { create: jest.fn(), save: jest.fn(), findAndCount: jest.fn() };
    tasksRepository = { findOneBy: jest.fn() };
    usersRepository = { findOneBy: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: getRepositoryToken(Comment), useValue: commentsRepository },
        { provide: getRepositoryToken(Task), useValue: tasksRepository },
        { provide: getRepositoryToken(User), useValue: usersRepository },
      ],
    }).compile();

    service = module.get(CommentsService);
  });

  it('creates a comment on an existing task (successful create)', async () => {
    const task = { id: 1 } as Task;
    const author = { id: 7 } as User;
    const savedComment = { id: 99, body: 'Looks good', task, author } as Comment;

    tasksRepository.findOneBy.mockResolvedValue(task);
    usersRepository.findOneBy.mockResolvedValue(author);
    commentsRepository.create.mockReturnValue(savedComment);
    commentsRepository.save.mockResolvedValue(savedComment);

    const result = await service.addComment(1, { body: 'Looks good', authorId: 7 });

    expect(tasksRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
    expect(commentsRepository.create).toHaveBeenCalledWith({ body: 'Looks good', task, author });
    expect(result).toBe(savedComment);
  });

  it('rejects with 404 when the task does not exist', async () => {
    tasksRepository.findOneBy.mockResolvedValue(null);

    await expect(service.addComment(999, { body: 'hi', authorId: 7 })).rejects.toThrow(
      NotFoundException,
    );
    expect(commentsRepository.create).not.toHaveBeenCalled();
    expect(commentsRepository.save).not.toHaveBeenCalled();
  });

  it('lists only the comments for the given task, paginated', async () => {
    const task = { id: 1 } as Task;
    tasksRepository.findOneBy.mockResolvedValue(task);
    const comments = [{ id: 1 }, { id: 2 }] as Comment[];
    commentsRepository.findAndCount.mockResolvedValue([comments, 2]);

    const result = await service.findByTask(1, { page: 1, pageSize: 20 });

    expect(commentsRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { task: { id: 1 } } }),
    );
    expect(result).toEqual({ items: comments, total: 2, page: 1 });
  });
});
