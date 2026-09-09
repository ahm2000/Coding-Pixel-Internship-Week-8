import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  body!: string;

  @Type(() => Number)
  @IsInt()
  authorId!: number;
}
