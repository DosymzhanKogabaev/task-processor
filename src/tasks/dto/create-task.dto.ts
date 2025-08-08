import { IsInt, IsString, Max, Min } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  payload!: string;

  @IsInt()
  @Min(0)
  @Max(10)
  priority!: number;
}
