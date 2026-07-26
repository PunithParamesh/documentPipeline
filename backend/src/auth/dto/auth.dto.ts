import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'john@example.com', description: 'The email of the user' })
  email!: string;

  @ApiProperty({ example: 'password123', description: 'The password of the user' })
  password!: string;

  @ApiProperty({ example: 'John', description: 'First name of the user' })
  firstName!: string;

  @ApiProperty({ example: 'Doe', description: 'Last name of the user' })
  lastName!: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'Optional phone number' })
  phoneNumber?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'john@example.com', description: 'The email of the user' })
  email!: string;

  @ApiProperty({ example: 'password123', description: 'The password of the user' })
  password!: string;
}
