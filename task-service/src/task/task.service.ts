import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Task } from './task.entity';
import { Neo4jService } from 'nest-neo4j/dist';
import { Kafka, Producer } from 'kafkajs';
import { TaskStatus } from '../enums/TaskStatus';

@Injectable()
export class TaskService implements OnModuleInit {
  private kafka = new Kafka({
    clientId: 'task-service',
    brokers: ['localhost:9092'],
  });

  private producer: Producer;
  constructor(private readonly neo4jService: Neo4jService) {}
  async onModuleInit() {
    this.producer = this.kafka.producer();
    await this.producer.connect();
  }

  private async sendToKafka(action: string, data: Record<string, any>) {
    await this.producer.send({
      topic: 'logs',
      messages: [{ value: JSON.stringify({ service: 'task', action, data }) }],
    });
  }

  async createTask(data: Record<string, any>): Promise<Task> {
    const queryGetLastNo = `
  MATCH (t:tasks)
  RETURN MAX(toInteger(SUBSTRING(t.no, 2))) AS lastNo
      `;
    const resultLastNo = await this.neo4jService.read(queryGetLastNo);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const lastNo = resultLastNo.records[0].get('lastNo');
    const newNo = `T${(Number(lastNo || 0) + 1).toString().padStart(4, '0')}`;

    // Status değerini enum olarak kontrol et
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (!Object.values(TaskStatus).includes(data.status)) {
      throw new Error(`Invalid status value: ${data.status}`);
    }

    const queryCreateTask = `
      MATCH (s:task {name: "task"}) 
      CREATE (t:tasks {no: $no, location: $location, status: $status, name: $name, description: $description})
      CREATE (s)-[:HAS_TASKS]->(t) 
      RETURN t
      `;

    data.no = newNo;
    data.status = TaskStatus[data.status as keyof typeof TaskStatus]; // Enum'a çevirme

    const result = await this.neo4jService.write(queryCreateTask, data);

    const node = result.records[0].get('t') as { properties: Task };
    const properties = node.properties;
    await this.sendToKafka('create', properties);

    return properties;
  }

  async updateTask(id: string, data: Record<string, any>) {
    const query = `
         MATCH (t:tasks) 
      WHERE id(t) = $id 
        SET t += $data
        RETURN t
    `;
    const numericId = parseInt(id, 10);
    const result = await this.neo4jService.write(query, {
      id: numericId,
      data,
    });

    if (result.records.length === 0) {
      throw new NotFoundException('Task not found');
    }

    const node = result.records[0].get('t') as {
      properties: Record<string, any>;
    };

    await this.sendToKafka('update', { id: numericId, ...data });
    return node.properties;
  }

  async getAllTask(): Promise<Task[]> {
    const query = `
        MATCH (t:tasks)
        RETURN t, ID(t) AS taskId
    `;
    const result = await this.neo4jService.read(query);

    return result.records.map((record) => {
      const node = record.get('t') as { properties: Task };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const taskId = record.get('taskId').low;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      return { ...node.properties, id: taskId };
    });
  }

  async deleteTask(id: string) {
    const query = `
      MATCH (t:tasks) 
      WHERE id(t) = $id 
      DETACH DELETE t
    `;

    try {
      const numericId = parseInt(id, 10);

      await this.neo4jService.write(query, { id: numericId });

      await this.sendToKafka('delete', { id: numericId });

      return { message: 'Task deleted successfully' };
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error('Failed to delete task');
    }
  }
}
