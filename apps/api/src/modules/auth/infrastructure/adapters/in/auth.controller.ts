import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';

import {
  AUTH_USE_CASE,
  AuthUseCase,
} from '@/modules/auth/domain/ports/in/auth-use-case.port';

import {
  AuthResponseDto,
  ChangePasswordDto,
  LoginCompleteDto,
  LoginInitiateDto,
  PasswordLoginDto,
  PasswordRegisterDto,
  RegisterCompleteDto,
  RegisterInitiateDto,
  WebAuthnOptionsDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_USE_CASE) private readonly authUseCase: AuthUseCase
  ) {}

  @Post('passkey/register/initiate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate user registration with invitation token' })
  @ApiResponse({
    status: 200,
    description: 'Registration options generated successfully',
    type: WebAuthnOptionsDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid invitation token' })
  async initiateRegistration(@Body() dto: RegisterInitiateDto) {
    return await this.authUseCase.initiateRegistration(
      dto.email,
      dto.invitationToken
    );
  }

  @Post('passkey/register/complete')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Complete user registration with WebAuthn credential',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Registration verification failed' })
  async completeRegistration(@Body() dto: RegisterCompleteDto) {
    return await this.authUseCase.completeRegistration(
      dto.email,
      dto.invitationToken,
      dto.credential,
      dto.deviceName
    );
  }

  @Post('passkey/login/initiate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate user login' })
  @ApiResponse({
    status: 200,
    description: 'Authentication options generated successfully',
    type: WebAuthnOptionsDto,
  })
  @ApiResponse({ status: 401, description: 'User not found' })
  async initiateLogin(@Body() dto: LoginInitiateDto) {
    return await this.authUseCase.initiateLogin(dto.email);
  }

  @Post('passkey/login/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete user login with WebAuthn credential' })
  @ApiResponse({
    status: 200,
    description: 'User authenticated successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication verification failed',
  })
  async completeLogin(@Body() dto: LoginCompleteDto) {
    return await this.authUseCase.completeLogin(dto.email, dto.credential);
  }

  @Post('password/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register user with password' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Registration failed' })
  async registerWithPassword(@Body() dto: PasswordRegisterDto) {
    return await this.authUseCase.registerWithPassword(
      dto.email,
      dto.password,
      dto.invitationToken
    );
  }

  @Post('password/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user with password' })
  @ApiResponse({
    status: 200,
    description: 'User authenticated successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication failed' })
  async loginWithPassword(@Body() dto: PasswordLoginDto) {
    return await this.authUseCase.loginWithPassword(dto.email, dto.password);
  }

  @Post('password/change')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Password change failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Request() req: ExpressRequest & { user: { userId: string } }
  ) {
    await this.authUseCase.changePassword(
      req.user.userId,
      dto.oldPassword,
      dto.newPassword
    );
    return { message: 'Password changed successfully' };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'User logged out successfully' })
  async logout(
    @Request() req: ExpressRequest & { user: { sessionId?: string } }
  ) {
    // Extract session ID from JWT token or request object
    const sessionId = req.user.sessionId || 'unknown';
    await this.authUseCase.logout(sessionId);
    return { message: 'Logged out successfully' };
  }
}
