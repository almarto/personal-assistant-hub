import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import {
  CreateInvitationDto,
  InvitationLinkDto,
  InvitationResponseDto,
  InvitationsListResponseDto,
} from './dto/invitations.dto';
import { InvitationsService } from './invitations.service';

@ApiTags('Invitations')
@Controller('invitations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create new invitation (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Invitation created successfully',
    type: InvitationLinkDto,
  })
  @ApiResponse({
    status: 400,
    description: 'User already exists or pending invitation exists',
  })
  async create(
    @Body() createInvitationDto: CreateInvitationDto,
    @Request() req: any
  ) {
    return await this.invitationsService.create(
      createInvitationDto,
      req.user.id
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all invitations (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Invitations retrieved successfully',
    type: InvitationsListResponseDto,
  })
  async findAll() {
    return await this.invitationsService.findAll();
  }

  @Get('validate')
  @ApiOperation({ summary: 'Validate invitation token' })
  @ApiQuery({ name: 'token', description: 'Invitation token' })
  @ApiQuery({ name: 'email', description: 'Email address' })
  @ApiResponse({ status: 200, description: 'Token validation result' })
  async validateToken(
    @Query('token') token: string,
    @Query('email') email: string
  ) {
    return await this.invitationsService.validateToken(token, email);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invitation by ID (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Invitation retrieved successfully',
    type: InvitationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async findOne(@Param('id') id: string) {
    return await this.invitationsService.findOne(id);
  }

  @Put(':id/resend')
  @ApiOperation({ summary: 'Resend invitation (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Invitation resent successfully',
    type: InvitationLinkDto,
  })
  @ApiResponse({ status: 400, description: 'Cannot resend used invitation' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async resend(
    @Param('id') id: string,
    @Body() body: { expirationHours?: number } = {}
  ) {
    return await this.invitationsService.resend(id, body.expirationHours);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke invitation (Admin only)' })
  @ApiResponse({ status: 200, description: 'Invitation revoked successfully' })
  @ApiResponse({ status: 400, description: 'Cannot revoke used invitation' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async revoke(@Param('id') id: string) {
    return await this.invitationsService.revoke(id);
  }
}
