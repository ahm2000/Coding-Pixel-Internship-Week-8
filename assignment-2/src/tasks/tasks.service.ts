import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Task } from '../entities/Task';
import { Project } from '../entities/Project';
import { User } from '../entities/User';
import { Tag } from '../entities/Tag';
import { TaskStatus } from '../entities/Enums';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskFilterDto } from './dto/task-filter.dto';

export interface PagedTasks {
  items: Task[];
  total: number;
  page: number;
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly tasksRepository: Repository<Task>,
    @InjectRepository(Project) private readonly projectsRepository: Repository<Project>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(Tag) private readonly tagsRepository: Repository<Tag>,
  ) {}

  private async loadTags(tagIds: number[]): Promise<Tag[]> {
    const tags = await this.tagsRepository.findBy({ id: In(tagIds) });
    const foundIds = new Set(tags.map((tag) => tag.id));
    const missing = tagIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new NotFoundException(`Tag(s) not found: ${missing.join(', ')}`);
    }
    return tags;
  }

  async create(dto: CreateTaskDto): Promise<Task> {
    const project = await this.projectsRepository.findOneBy({ id: dto.projectId });
    if (!project) {
      throw new NotFoundException(`Project ${dto.projectId} not found`);
    }

    let assignee: User | null = null;
    if (dto.assigneeId != null) {
      assignee = await this.usersRepository.findOneBy({ id: dto.assigneeId });
      if (!assignee) {
        throw new NotFoundException(`User ${dto.assigneeId} not found`);
      }
    }

    const tags = dto.tagIds && dto.tagIds.length > 0 ? await this.loadTags(dto.tagIds) : [];

    const task = this.tasksRepository.create({
      title: dto.title,
      description: dto.description ?? null,
      status: dto.status ?? TaskStatus.TODO,
      priority: dto.priority ?? 3,
      project,
      assignee,
      tags,
    });
    return this.tasksRepository.save(task);
  }

  async findAll(filter: TaskFilterDto): Promise<PagedTasks> {
    const qb = this.tasksRepository.createQueryBuilder('task');

    if (filter.status) {
      qb.andWhere('task.status = :status', { status: filter.status });
    }
    if (filter.projectId != null) {
      qb.andWhere('task.project_id = :projectId', { projectId: filter.projectId });
    }
    if (filter.assigneeId != null) {
      qb.andWhere('task.assignee_id = :assigneeId', { assigneeId: filter.assigneeId });
    }

    const page = filter.page ?? 1;
    const pageSize = Math.min(filter.pageSize ?? 20, 100);
    qb.orderBy('task.id', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page };
  }

  async findOne(id: number): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: { project: true, assignee: true, tags: true },
    });
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    return task;
  }

  async update(id: number, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(id);

    if (dto.projectId != null) {
      const project = await this.projectsRepository.findOneBy({ id: dto.projectId });
      if (!project) {
        throw new NotFoundException(`Project ${dto.projectId} not found`);
      }
      task.project = project;
    }

    if (dto.assigneeId != null) {
      const assignee = await this.usersRepository.findOneBy({ id: dto.assigneeId });
      if (!assignee) {
        throw new NotFoundException(`User ${dto.assigneeId} not found`);
      }
      task.assignee = assignee;
    }

    if (dto.tagIds) {
      task.tags = dto.tagIds.length > 0 ? await this.loadTags(dto.tagIds) : [];
    }

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.status !== undefined) task.status = dto.status;
    if (dto.priority !== undefined) task.priority = dto.priority;

    return this.tasksRepository.save(task);
  }

  async remove(id: number): Promise<void> {
    const result = await this.tasksRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Task ${id} not found`);
    }
  }
}
