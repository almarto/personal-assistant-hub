import { ApiProperty } from '@nestjs/swagger';
import {
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/server';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  ValidateNested,
  MinLength,
  MaxLength,
} from 'class-validator';

export class RegisterInitiateDto {
  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Invitation token',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  invitationToken: string;
}

export class RegisterCompleteDto {
  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Invitation token',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  invitationToken: string;

  @ApiProperty({
    description: 'WebAuthn credential',
    type: 'object',
    additionalProperties: true,
  })
  @IsNotEmpty()
  @ValidateNested()
  credential: RegistrationResponseJSON;

  @ApiProperty({
    description: 'Device name',
    example: "John's iPhone",
  })
  @IsString()
  @IsNotEmpty()
  deviceName: string;
}

export class LoginInitiateDto {
  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class LoginCompleteDto {
  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'WebAuthn credential',
    type: 'object',
    additionalProperties: true,
  })
  @IsNotEmpty()
  @ValidateNested()
  credential: AuthenticationResponseJSON;
}

export class WebAuthnOptionsDto {
  @ApiProperty({
    description: 'WebAuthn options',
    type: 'object',
    additionalProperties: true,
  })
  options:
    | PublicKeyCredentialCreationOptionsJSON
    | PublicKeyCredentialRequestOptionsJSON;
}

export class PasswordRegisterDto {
  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiProperty({
    description: 'Invitation token',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  invitationToken: string;
}

export class PasswordLoginDto {
  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'OldPassword123!',
  })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({
    description: 'New password',
    example: 'NewSecurePassword123!',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}

export class UserDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User role',
    example: 'user',
  })
  role: string;

  @ApiProperty({
    description: 'User active status',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Creation date',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2023-01-01T00:00:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Last login date',
    example: '2023-01-01T00:00:00.000Z',
    nullable: true,
  })
  lastLoginAt?: Date | null;

  @ApiProperty({
    description: 'Whether user has password authentication',
    example: true,
  })
  hasPassword: boolean;

  @ApiProperty({
    description: 'Whether user has passkey authentication',
    example: false,
  })
  hasPasskeys: boolean;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'User information',
    type: UserDto,
  })
  user: UserDto;

  @ApiProperty({
    description: 'JWT token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;
}
