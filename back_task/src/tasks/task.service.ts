import { Injectable, NotFoundException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { Task } from './task.entity';

@Injectable()
export class TaskService {
  constructor(private readonly neo4jService: Neo4jService) {}

  async createTask(data: Record<string, any>): Promise<Task> {
    const query = `
            CREATE (t:Task {taskNo: $taskNo, locationNo: $locationNo, status: $status})
            RETURN t
        `;
    const result = await this.neo4jService.write(query, data);
    const node = result.records[0].get('t') as { properties: Task };
    const properties = node.properties;
    return properties;
  }

  async getTask(taskNo: string) {
    const query = `
            MATCH (t:Task {taskNo: $taskNo})
            RETURN t
        `;
    const result = await this.neo4jService.read(query, { taskNo });
    const node = result.records[0].get('t') as { properties: Task };
    const properties = node.properties;

    if (result.records.length === 0) {
      throw new Error('Task not found');
    }

    return properties;
  }

  async updateTask(taskNo: string, data: Record<string, any>) {
    const query = `
        MATCH (t:Task {taskNo: $taskNo})
        SET t += $data
        RETURN t
    `;

    const result = await this.neo4jService.write(query, { taskNo, data });

    if (result.records.length === 0) {
      throw new NotFoundException('Task not found');
    }

    const node = result.records[0].get('t') as {
      properties: Record<string, any>;
    };
    return node.properties;
  }

  async getAllTasks(): Promise<Task[]> {
    const query = `
        MATCH (t:Task)
        RETURN t
    `;
    const result = await this.neo4jService.read(query);

    return result.records.map((record) => {
      const node = record.get('t') as { properties: Task }; // Neo4j node tipini zorluyoruz
      return node.properties;
    });
  }

  async deleteTask(taskNo: string) {
    const query = `
            MATCH (t:Task {taskNo: $taskNo})
            DELETE t
        `;
    await this.neo4jService.write(query, { taskNo });
    return { message: 'Task deleted' };
  }
}
