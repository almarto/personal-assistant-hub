import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
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

import { AuthService } from './auth.service';
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
  constructor(private readonly authService: AuthService) {}

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
    return await this.authService.initiateRegistration(
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
    return await this.authService.completeRegistration(
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
    return await this.authService.initiateLogin(dto.email);
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
    return await this.authService.completeLogin(dto.email, dto.credential);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Request() req: any) {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    return await this.authService.logout(req.user.id, sessionToken);
  }

  @Post('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({
    status: 200,
    description: 'User information retrieved successfully',
  })
  async getCurrentUser(@Request() req: any) {
    return { user: req.user };
  }
}
