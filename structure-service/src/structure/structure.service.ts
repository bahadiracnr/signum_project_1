import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Structure } from './structure.entity';
import { Neo4jService } from 'nest-neo4j/dist';
import { Kafka, Producer } from 'kafkajs';
import { StructureType } from 'src/enums/StrcutureType';

@Injectable()
export class StructureService implements OnModuleInit {
  private kafka = new Kafka({
    clientId: 'structure-service',
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
      messages: [
        { value: JSON.stringify({ service: 'structure', action, data }) },
      ],
    });
  }

  async createStructures(
    type: StructureType,

    data: Record<string, any>,
  ): Promise<Structure> {
    if (type === StructureType.BUILD) {
      return this.createBuild(data);
    } else if (type === StructureType.FLOOR) {
      return this.createFloor(data);
    } else if (type === StructureType.SPACE) {
      return this.createSpace(data);
    }
    throw new Error('Structure not found');
  }

  async createBuild(data: Record<string, any>): Promise<Structure> {
    const queryGetLastNo = `
MATCH (t:Build)
RETURN MAX(toInteger(SUBSTRING(t.no, 2))) AS lastNo

    `;
    const resultLastNo = await this.neo4jService.read(queryGetLastNo);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const lastNo = resultLastNo.records[0].get('lastNo');
    const newNo = `B${(Number(lastNo || 0) + 1).toString().padStart(4, '0')}`;

    const queryCreateTask = `
MATCH (s:Structures {name: "Structures"})  
CREATE (t:Build {no: $no, coname: $coname})
CREATE (s)-[:HAS_BUILD]->(t)  
RETURN t
        `;
    data.no = newNo;
    const result = await this.neo4jService.write(queryCreateTask, data);
    const node = result.records[0].get('t') as { properties: Structure };

    const properties = node.properties;
    await this.sendToKafka('create', properties);
    return properties;
  }

  async createFloor(data: Record<string, any>): Promise<Structure> {
    const queryGetLastNo = `
MATCH (t:Floor)
RETURN MAX(toInteger(SUBSTRING(t.no, 2))) AS lastNo

    `;
    const resultLastNo = await this.neo4jService.read(queryGetLastNo);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const lastNo = resultLastNo.records[0].get('lastNo');
    const newNo = `F${(Number(lastNo || 0) + 1).toString().padStart(4, '0')}`;

    const queryCreateTask = `
    MATCH (fn:Build)
    WHERE id(fn) = $id
    CREATE (t:Floor {no: $no, coname: $coname})
    CREATE (fn)-[:HAS_FLOOR]->(t)
    RETURN t
    `;

    data.no = newNo;

    const result = await this.neo4jService.write(queryCreateTask, {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      no: data.no,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      coname: data.coname,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      id: parseInt(data.id, 10), // ID integer olarak gönderilmeli
    });

    if (!result.records.length) {
      throw new Error('No records found, possibly incorrect Build ID');
    }

    const node = result.records[0].get('t') as { properties: Structure };
    const properties = node.properties;
    await this.sendToKafka('create', properties);
    return properties;
  }

  async createSpace(data: Record<string, any>): Promise<Structure> {
    const queryGetLastNo = `
    MATCH (s:Space)
    RETURN COALESCE(MAX(toInteger(SUBSTRING(s.no, 2))), 0) AS lastNo
    `;

    const resultLastNo = await this.neo4jService.read(queryGetLastNo);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const lastNo = resultLastNo.records[0].get('lastNo');
    const newNo = `T${(Number(lastNo) + 1).toString().padStart(3, '0')}`;

    const queryCreateTask = `
    MATCH (fn:Floor)
    WHERE id(fn) = $id
    CREATE (t:Space {no: $no, coname: $coname})
    CREATE (fn)-[:HAS_SPACE]->(t)
    RETURN t
    `;

    data.no = newNo;
    const result = await this.neo4jService.write(queryCreateTask, {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      no: data.no,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      coname: data.coname,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      id: parseInt(data.id, 10),
    });

    if (!result.records.length) {
      throw new Error('No records found, possibly incorrect Floor ID');
    }

    const node = result.records[0].get('t') as { properties: Structure };
    const properties = node.properties;
    await this.sendToKafka('create', properties);
    return properties;
  }

  async getStructures(type: StructureType, id: string) {
    if (type === StructureType.BUILD) {
      return this.getBuilds();
    } else if (type === StructureType.FLOOR) {
      return this.getFloors(id);
    } else if (type === StructureType.SPACE) {
      return this.getSpaces(id);
    }

    throw new Error('Structure not found');
  }

  async getBuilds() {
    try {
      const query = `
        MATCH (s:Structures)-[:HAS_BUILD]->(b:Build)
        OPTIONAL MATCH (b)-[:HAS_FLOOR]->(f:Floor)
        RETURN DISTINCT b, ID(b) AS buildId, CASE WHEN f IS NOT NULL THEN true ELSE false END AS hasFloor
      `;
      const result = await this.neo4jService.read(query);

      if (!result || !result.records || result.records.length === 0) {
        throw new Error('No results found');
      }

      return result.records.map((record) => {
        const node = record.get('b') as { properties: Structure };
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const buildId = record.get('buildId').low; // sadece 'low' kısmını alıyoruz
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const hasFloor = record.get('hasFloor');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        return { ...node.properties, id: buildId, hasFloor }; // 'id' olarak 'low' kısmını döndürüyoruz
      });
    } catch (error) {
      console.error('Error occurred while fetching builds:', error);
      throw new Error(`Building not found. Details: `);
    }
  }

  async getFloors(id: string) {
    try {
      const query = `
        MATCH (s:Build)
        WHERE ID(s) = $id
        MATCH (s)-[:HAS_FLOOR]->(b:Floor)
        OPTIONAL MATCH (b)-[:HAS_SPACE]->(f:Space)
        RETURN DISTINCT b, ID(b) AS FloorId, CASE WHEN f IS NOT NULL THEN true ELSE false END AS hasSpace
      `;
      const result = await this.neo4jService.read(query, { id: Number(id) }); // id'yi sayısal formata çevir

      if (!result || !result.records || result.records.length === 0) {
        throw new Error('No results found');
      }

      return result.records.map((record) => {
        const node = record.get('b') as { properties: Structure }; // 'b' doğru node ismi
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const buildId = record.get('FloorId').low; // sadece 'low' kısmını alıyoruz
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const hasSpace = record.get('hasSpace');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        return { ...node.properties, id: buildId, hasSpace };
      });
    } catch (error) {
      console.error('Error occurred while fetching floors:', error);
      throw new Error(`Floor not found. Details: `);
    }
  }

  async getSpaces(buildId: string) {
    try {
      const query = `
        MATCH (s:Floor)
        WHERE ID(s) = $buildId
        MATCH (s)-[:HAS_SPACE]->(b:Space)
        OPTIONAL MATCH (b)-[:HAS_SPACE]->(f:Space)
        RETURN DISTINCT b, ID(b) AS FloorId, CASE WHEN f IS NOT NULL THEN true ELSE false END AS hasSpace
      `;

      const result = await this.neo4jService.read(query, {
        buildId: Number(buildId),
      });

      if (!result || !result.records || result.records.length === 0) {
        throw new Error('No results found');
      }

      return result.records.map((record) => {
        const node = record.get('b') as { properties: Structure };
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const hasSpace = record.get('hasSpace');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        return { ...node.properties, hasSpace };
      });
    } catch (error) {
      console.error('Error occurred while fetching spaces:', error);
      throw new Error(`Error occurred while fetching spaces: `);
    }
  }

  async updateStructure(no: string, data: Record<string, any>) {
    const query = `
        MATCH (t:Structure {no: $no})
        SET t += $data
        RETURN t
    `;

    const result = await this.neo4jService.write(query, { no, data });

    if (result.records.length === 0) {
      throw new NotFoundException('Structure not found');
    }

    const node = result.records[0].get('t') as {
      properties: Record<string, any>;
    };
    await this.sendToKafka('update', { no, ...data });
    return node.properties;
  }

  async updateStructures(
    type: StructureType,
    id: string,
    data: Record<string, any>,
  ) {
    if (type === StructureType.BUILD) {
      return this.updateBuild(id, data);
    } else if (type === StructureType.FLOOR) {
      return this.updateFloor(id, data);
    } else if (type === StructureType.SPACE) {
      return this.updateSpace(id, data);
    }
    throw new Error('Structure not found');
  }

  async updateBuild(id: string, data: Record<string, any>) {
    const query = `
        MATCH (t:Build) 
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
      throw new NotFoundException('Build not found');
    }

    const node = result.records[0].get('t') as {
      properties: Record<string, any>;
    };
    await this.sendToKafka('update', { id, ...data });
    return node.properties;
  }

  async updateFloor(id: string, data: Record<string, any>) {
    const query = `
        MATCH (t:Floor) 
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
      throw new NotFoundException('Floor not found');
    }

    const node = result.records[0].get('t') as {
      properties: Record<string, any>;
    };
    await this.sendToKafka('update', { id, ...data });
    return node.properties;
  }

  async updateSpace(id: string, data: Record<string, any>) {
    const query = `
        MATCH (t:Space) 
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
      throw new NotFoundException('Space not found');
    }

    const node = result.records[0].get('t') as {
      properties: Record<string, any>;
    };
    await this.sendToKafka('update', { id, ...data });
    return node.properties;
  }

  async deleteStructures(type: StructureType, id: string) {
    if (type === StructureType.BUILD) {
      return this.deleteBuild(id);
    } else if (type === StructureType.FLOOR) {
      return this.deleteFloor(id);
    } else if (type === StructureType.SPACE) {
      return this.deleteSpace(id);
    }
    throw new Error('Structure not found');
  }

  async deleteBuild(id: string) {
    const query = `
      MATCH (t:Build) 
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

  async deleteFloor(id: string) {
    const query = `
      MATCH (f:Floor) 
      WHERE id(f) = $id 
      OPTIONAL MATCH (f)-[:HAS_SPACE]->(s:Space)
    DETACH DELETE f, s
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

  async deleteSpace(id: string) {
    const query = `
      MATCH (t:Space) 
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
