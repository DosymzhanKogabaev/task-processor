import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(@Body() dto: CreateTaskDto) {
    const res = await this.tasksService.create(dto);
    return res;
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const task = await this.tasksService.findById(id);
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }
}
