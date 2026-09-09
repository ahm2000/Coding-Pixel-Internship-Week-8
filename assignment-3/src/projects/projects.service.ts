import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/Project';
import { User } from '../entities/User';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private readonly projectsRepository: Repository<Project>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  private async loadOwner(ownerId: number): Promise<User> {
    const owner = await this.usersRepository.findOneBy({ id: ownerId });
    if (!owner) {
      throw new NotFoundException(`User ${ownerId} not found`);
    }
    return owner;
  }

  async create(dto: CreateProjectDto): Promise<Project> {
    const owner = await this.loadOwner(dto.ownerId);
    const project = this.projectsRepository.create({ name: dto.name, owner });
    return this.projectsRepository.save(project);
  }

  findAll(): Promise<Project[]> {
    return this.projectsRepository.find();
  }

  async findOne(id: number): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: { owner: true },
    });
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    return project;
  }

  async update(id: number, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(id);

    if (dto.ownerId != null) {
      project.owner = await this.loadOwner(dto.ownerId);
    }
    if (dto.name !== undefined) {
      project.name = dto.name;
    }

    return this.projectsRepository.save(project);
  }

  async remove(id: number): Promise<void> {
    const result = await this.projectsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Project ${id} not found`);
    }
  }
}
