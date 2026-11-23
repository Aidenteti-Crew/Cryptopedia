import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export class SigninDto {
  static schema = z.object({
    email: z.string().email(),
    from: z.enum(['main', 'start']).optional(),
    intent: z.literal('signup').optional(),
  });

  @ApiProperty({ example: 'tomatojams@naver.com' })
  email!: string;

  @ApiProperty({ example: 'main', enum: ['main', 'start'], required: false })
  from?: 'main' | 'start';

  @ApiProperty({
    enum: ['signup'],
    required: false,
    description:
      'Marks the link as a sign-up confirmation, so the login page offers to set a password next',
  })
  intent?: 'signup';
}
