import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class CreateInvitationDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 24,
    description: 'Expiration time in hours (default: 24, max: 168)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168) // 7 days max
  expirationHours?: number;
}

export class InvitationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  token: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  createdBy: string;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty({ nullable: true })
  usedAt: Date | null;

  @ApiProperty({ nullable: true })
  usedBy: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  isExpired: boolean;

  @ApiProperty()
  isUsed: boolean;
}

export class InvitationsListResponseDto {
  @ApiProperty({ type: [InvitationResponseDto] })
  invitations: InvitationResponseDto[];

  @ApiProperty()
  total: number;
}

export class InvitationLinkDto {
  @ApiProperty()
  invitationLink: string;

  @ApiProperty()
  token: string;

  @ApiProperty()
  expiresAt: Date;
}
