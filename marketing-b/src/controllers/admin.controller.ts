import {
  Controller,
  Get,
  UseGuards,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AdminService } from '../services/admin.service';
import { AdminUserDto } from '../dto/admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('users')
  async getAllUsers(): Promise<AdminUserDto[]> {
    return this.adminService.getAllUsersWithDetails();
  }

  @Get('users/:id')
  async getUserDetails(
    @Param('id', ParseIntPipe) userId: number,
  ): Promise<AdminUserDto> {
    return this.adminService.getUserDetails(userId);
  }
}
