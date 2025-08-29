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

import {
  AUTH_USE_CASE,
  AuthUseCase,
} from '@/modules/auth/domain/ports/in/auth-use-case.port';

import {
  AuthResponseDto,
  LoginCompleteDto,
  LoginInitiateDto,
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

  @Post('register/initiate')
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

  @Post('register/complete')
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

  @Post('login/initiate')
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

  @Post('login/complete')
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

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'User logged out successfully' })
  async logout(@Request() req: any) {
    // Extract session ID from JWT token or request object
    const sessionId = req.user.sessionId || 'unknown';
    await this.authUseCase.logout(sessionId);
    return { message: 'Logged out successfully' };
  }
}
