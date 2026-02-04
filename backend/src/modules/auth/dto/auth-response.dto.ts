import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto';

export class AuthLoginResponseDto {
  @ApiProperty({ description: 'JWT access token', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  access_token: string;

  @ApiProperty({ description: 'Authenticated user profile', type: () => UserResponseDto })
  user: UserResponseDto;

  @ApiPropertyOptional({
    description: 'Optional success message',
    example: 'Login successful. Cookie set.',
  })
  message?: string;
}

export class AuthLogoutResponseDto {
  @ApiProperty({ description: 'Logout message', example: 'Logged out successfully' })
  message: string;
}

export class AuthProfileResponseDto {
  @ApiProperty({ description: 'User ID (UUID)', example: 'c23e4567-e89b-12d3-a456-426614174011' })
  id: string;

  @ApiProperty({ description: 'Username', example: 'admin' })
  username: string;

  @ApiProperty({ description: 'User role', example: 'ADMIN' })
  role: string;

  @ApiPropertyOptional({ description: 'Role ID', example: 'role-admin' })
  roleId?: string;
}
