import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Query,
} from '@nestjs/common';
import { StructureService } from './structure.service';
import { StructureType } from 'src/enums/StrcutureType';

@Controller('structure')
export class StructureController {
  constructor(private readonly structureService: StructureService) {}

  @Post()
  createStructures(
    @Query('id') id: string,
    @Query('type') type: StructureType,
    @Body() body: Record<string, any>,
  ) {
    return this.structureService.createStructures(type, id, body);
  }

  @Get()
  getStructures(@Query('type') type: StructureType, @Query('id') id: string) {
    return this.structureService.getStructures(type, id);
  }

  @Put()
  updateStructures(
    @Query('id') id: string, // Query'den id'yi alıyoruz
    @Query('type') type: StructureType,
    @Body() body: Record<string, any>,
  ) {
    return this.structureService.updateStructures(type, id, body);
  }

  @Delete()
  deleteStructures(
    @Query('type') type: StructureType,
    @Query('id') id: string,
  ) {
    return this.structureService.deleteStructures(type, id);
  }
}
