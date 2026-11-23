import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

import { newPasswordField, PASSWORD_MAX_BYTES } from '../password-policy';

export class SetPasswordDto {
  static schema = z.object({
    password: newPasswordField,
    currentPassword: z
      .string()
      .min(1)
      .refine((v) => Buffer.byteLength(v, 'utf8') <= PASSWORD_MAX_BYTES)
      .optional(),
  });

  @ApiProperty({
    description:
      'At least 8 characters and at most 72 bytes, with one letter and one digit',
  })
  password!: string;

  @ApiPropertyOptional({
    description:
      'Required when a password already exists, unless the session came from an e-mail link within 15 minutes',
  })
  currentPassword?: string;
}
