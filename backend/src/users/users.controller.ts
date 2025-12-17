import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignObjectsDto } from './dto/assign-objects.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.MINISTER)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(tenantId, dto);
  }

  @Get()
  @Roles(Role.MINISTER, Role.TECHNADZOR)
  findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.usersService.findAll(tenantId);
  }

  @Get(':id')
  @Roles(Role.MINISTER, Role.TECHNADZOR)
  findOne(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.usersService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(Role.MINISTER)
  update(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @Roles(Role.MINISTER)
  remove(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.usersService.remove(id, tenantId);
  }

  @Patch(':id/objects')
  @Roles(Role.MINISTER)
  assignObjects(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: AssignObjectsDto,
  ) {
    return this.usersService.assignObjects(id, tenantId, dto);
  }

  @Get(':id/objects')
  @Roles(Role.MINISTER, Role.TECHNADZOR)
  getAssignedObjects(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.usersService.getAssignedObjects(id, tenantId);
  }
}
