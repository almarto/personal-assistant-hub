import { ApiProperty } from '@nestjs/swagger';
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/types';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterInitiateDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'invitation-token-uuid' })
  @IsString()
  @IsNotEmpty()
  invitationToken: string;
}

export class RegisterCompleteDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'invitation-token-uuid' })
  @IsString()
  @IsNotEmpty()
  invitationToken: string;

  @ApiProperty({ description: 'WebAuthn registration response' })
  @IsNotEmpty()
  credential: RegistrationResponseJSON;

  @ApiProperty({ example: 'My iPhone', required: false })
  @IsOptional()
  @IsString()
  deviceName?: string;
}

export class LoginInitiateDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}

export class LoginCompleteDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'WebAuthn authentication response' })
  @IsNotEmpty()
  credential: AuthenticationResponseJSON;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  user: {
    id: string;
    email: string;
    role: string;
    createdAt: Date;
    lastLoginAt: Date | null;
  };
}

export class WebAuthnOptionsDto {
  @ApiProperty({ description: 'WebAuthn challenge options' })
  options: any;
}
