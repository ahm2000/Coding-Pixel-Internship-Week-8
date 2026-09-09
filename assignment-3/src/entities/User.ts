import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Project } from './Project';
import { ProjectMember } from './ProjectMember';
import { Task } from './Task';
import { Comment } from './Comment';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => Project, (project) => project.owner)
  ownedProjects!: Project[];

  @OneToMany(() => ProjectMember, (member) => member.user)
  memberships!: ProjectMember[];

  @OneToMany(() => Task, (task) => task.assignee)
  assignedTasks!: Task[];

  @OneToMany(() => Comment, (comment) => comment.author)
  comments!: Comment[];
}
