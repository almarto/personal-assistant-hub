import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
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
import { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    id: string;
    [key: string]: unknown;
  };
}

import { Roles } from '@/modules/auth/infrastructure/adapters/in/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/adapters/in/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/infrastructure/adapters/in/guards/roles.guard';
import {
  INVITATION_USE_CASE,
  InvitationUseCase,
} from '@/modules/invitations/domain/ports/in/invitation-use-case.port';

import {
  CreateInvitationDto,
  InvitationLinkDto,
  InvitationResponseDto,
  InvitationsListResponseDto,
} from './dto/invitations.dto';

@ApiTags('Invitations')
@Controller('invitations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class InvitationsController {
  constructor(
    @Inject(INVITATION_USE_CASE)
    private readonly invitationUseCase: InvitationUseCase
  ) {}

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
    @Request() req: AuthenticatedRequest
  ) {
    try {
      return await this.invitationUseCase.create(
        createInvitationDto.email,
        req.user.id,
        createInvitationDto.expirationHours,
        createInvitationDto.role
      );
    } catch (error) {
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all invitations (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Invitations retrieved successfully',
    type: InvitationsListResponseDto,
  })
  async findAll() {
    try {
      return await this.invitationUseCase.findAll();
    } catch (error) {
      throw error;
    }
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
    try {
      return await this.invitationUseCase.validateToken(token, email);
    } catch (error) {
      throw error;
    }
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
    try {
      return await this.invitationUseCase.findOne(id);
    } catch (error) {
      throw error;
    }
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
    try {
      return await this.invitationUseCase.resend(id, body.expirationHours);
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke invitation (Admin only)' })
  @ApiResponse({ status: 200, description: 'Invitation revoked successfully' })
  @ApiResponse({ status: 400, description: 'Cannot revoke used invitation' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async revoke(@Param('id') id: string) {
    try {
      return await this.invitationUseCase.revoke(id);
    } catch (error) {
      throw error;
    }
  }
}
