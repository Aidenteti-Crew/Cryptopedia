import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

import { PASSWORD_MAX_BYTES } from '../password-policy';

export class PasswordLoginDto {
  // Only bounds are checked here: an old or weak password must still reach the 401 path.
  static schema = z.object({
    email: z.string().email().max(255),
    password: z
      .string()
      .min(1)
      .refine((v) => Buffer.byteLength(v, 'utf8') <= PASSWORD_MAX_BYTES),
  });

  @ApiProperty({ example: 'tomatojams@naver.com' })
  email!: string;

  @ApiProperty()
  password!: string;
}
