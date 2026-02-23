import { Body, Controller, Post, Get, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: any) {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('impersonate/:userId')
  async impersonate(
    @CurrentUser() user: any,
    @Param('userId') targetUserId: string,
  ) {
    if (user.role !== 'SUPERADMIN') {
      throw new ForbiddenException('Только суперадмин может выполнять имперсонацию');
    }
    return this.authService.impersonate(targetUserId);
  }
}
