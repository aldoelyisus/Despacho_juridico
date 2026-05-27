import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditoriaService } from './auditoria.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles, RolEnum } from '../common/decorators/roles.decorator';

@ApiTags('🔍 Auditoría')
@ApiBearerAuth('JWT-auth')
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly service: AuditoriaService) {}

  @Get('logs')
  @Roles(RolEnum.ADMIN)
  @ApiOperation({ summary: 'Registro de actividad del sistema (solo administradores)' })
  findAll(@CurrentUser('despachoId') despachoId: number, @Query() query: any) {
    return this.service.findAll(despachoId, query);
  }
}
