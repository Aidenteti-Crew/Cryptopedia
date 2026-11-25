import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';

import {
  AppUserAuthService,
  type PasswordChangeClaims,
} from './app-user-auth.service';
import { SetPasswordDto } from './input-dto/set-password.dto';
import { passwordViolation } from './password-policy';
import { FakeAppUserDb, FakeRedis } from './fake-app-user-db.testing-spec';
import sendEmail from 'src/utils/resend';

const mockVerifyIdToken = jest.fn();

jest.mock('src/common/basic-service/redis.service', () => ({
  RedisService: class {},
}));
jest.mock('src/utils/resend', () => ({
  __esModule: true,
  default: jest.fn(),
  EMAIL_TEMPLATE: (
    _title: string,
    _body: string,
    _button: string,
    link: string,
  ) => link,
}));
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
  })),
}));

const mailer = sendEmail as unknown as jest.Mock;

const EMAIL = 'Owner@Example.com';
const NORMALIZED = 'owner@example.com';
const PASSWORD = 'correct horse 9';

function fakeReq(): any {
  return { headers: { 'user-agent': 'jest' }, ip: '127.0.0.1' };
}

function fakeRes() {
  return { cookie: jest.fn(), clearCookie: jest.fn() } as any;
}

function sentLink(callIndex = mailer.mock.calls.length - 1): URL {
  return new URL(mailer.mock.calls[callIndex][2] as string);
}

async function thrownResponse(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error: any) {
    return { status: error.getStatus(), body: error.getResponse() };
  }
  throw new Error('expected a rejection');
}

describe('password login', () => {
  let db: FakeAppUserDb;
  let redis: FakeRedis;
  let service: AppUserAuthService;

  beforeEach(() => {
    mailer.mockReset();
    mockVerifyIdToken.mockReset();
    process.env.GOOGLE_CLIENT_ID = 'test-client';
    db = new FakeAppUserDb();
    redis = new FakeRedis();
    service = new AppUserAuthService(
      db.knex as any,
      new JwtService(),
      redis as any,
    );
  });

  const tokenClaims = (accessToken: string): PasswordChangeClaims =>
    new JwtService().decode(accessToken) as PasswordChangeClaims;

  describe('sign-up', () => {
    it('mails a sign-up link to /login with intent=signup and stores no password', async () => {
      const result = await service.signin(
        { email: EMAIL, from: 'main', intent: 'signup' },
        fakeReq(),
      );

      const row = db.byEmail(NORMALIZED)!;
      expect(row.password_hash).toBeNull();
      expect(mailer).toHaveBeenCalledTimes(1);
      expect(mailer.mock.calls[0][0]).toBe(NORMALIZED);
      expect(mailer.mock.calls[0][1]).toBe('가입을 확인해 주세요');
      const link = sentLink();
      expect(link.pathname).toBe('/login');
      expect(link.searchParams.get('intent')).toBe('signup');
      expect(link.searchParams.get('email')).toBe(NORMALIZED);
      expect(Object.keys(result)).toEqual(['expiresAt']);
    });

    it('keeps a plain sign-in link free of the sign-up intent', async () => {
      await service.signin({ email: EMAIL, from: 'main' }, fakeReq());
      expect(sentLink().searchParams.has('intent')).toBe(false);
      expect(mailer.mock.calls[0][1]).toBe('Your Cherry sign-in link');
    });

    it('answers a known and an unknown address the same way and leaves an existing password alone', async () => {
      const original = await hash('original password 1', 4);
      db.add({ email: NORMALIZED, password_hash: original });

      const unknown = await service.signin(
        { email: 'new@example.com', from: 'main', intent: 'signup' },
        fakeReq(),
      );
      const known = await service.signin(
        { email: EMAIL, from: 'main', intent: 'signup' },
        fakeReq(),
      );

      expect(Object.keys(known)).toEqual(Object.keys(unknown));
      expect(db.byEmail(NORMALIZED)!.password_hash).toBe(original);
      expect(db.byEmail('new@example.com')!.password_hash).toBeNull();
      expect(mailer.mock.calls.map((call) => call[0])).toEqual([
        'new@example.com',
        NORMALIZED,
      ]);
      expect(db.rows).toHaveLength(2);
    });

    it('sets the password only after the mailed link is used, then password sign-in works', async () => {
      await service.signin(
        { email: EMAIL, from: 'main', intent: 'signup' },
        fakeReq(),
      );
      await expect(
        service.passwordLogin({ email: EMAIL, password: PASSWORD }, fakeRes()),
      ).rejects.toMatchObject({ status: 401 });

      const link = sentLink();
      const session = await service.login(
        {
          email: link.searchParams.get('email')!,
          signInToken: link.searchParams.get('token')!,
        },
        fakeReq(),
        fakeRes(),
      );
      expect((await service.me(session.user.id)).hasPassword).toBe(false);

      const set = await service.setPassword(
        session.user.id,
        tokenClaims(session.accessToken),
        { password: PASSWORD },
        fakeRes(),
      );
      expect(set.hasPassword).toBe(true);
      const stored = db.byEmail(NORMALIZED)!.password_hash;
      expect(stored).toMatch(/^\$2[aby]\$12\$/);
      expect(stored).not.toContain(PASSWORD);
      expect((await service.me(session.user.id)).hasPassword).toBe(true);

      const res = fakeRes();
      const login = await service.passwordLogin(
        { email: EMAIL, password: PASSWORD },
        res,
      );
      expect(login.user.email).toBe(NORMALIZED);
      expect(tokenClaims(login.accessToken).amr).toBe('password');
      expect(res.cookie).toHaveBeenCalledWith(
        'cherryRefreshToken',
        expect.any(String),
        expect.objectContaining({ httpOnly: true }),
      );
      expect(db.byEmail(NORMALIZED)!.last_login_at).toBeInstanceOf(Date);
      for (const answer of [set, login]) {
        expect(JSON.stringify(answer)).not.toMatch(/\$2[aby]\$|password_hash/);
        expect(JSON.stringify(answer)).not.toContain(PASSWORD);
      }
    });
  });

  describe('sign-in', () => {
    it('gives byte-identical 401 answers for every failure kind', async () => {
      const good = await hash(PASSWORD, 4);
      db.add({ email: 'ok@example.com', password_hash: good });
      db.add({ email: 'nopw@example.com' });
      db.add({
        email: 'inactive@example.com',
        password_hash: good,
        is_active: false,
      });
      db.add({
        email: 'revoked@example.com',
        password_hash: good,
        revoked_at: new Date(),
      });

      const attempts = [
        { email: 'missing@example.com', password: PASSWORD },
        { email: 'ok@example.com', password: 'wrong password 1' },
        { email: 'nopw@example.com', password: PASSWORD },
        { email: 'inactive@example.com', password: PASSWORD },
        { email: 'revoked@example.com', password: PASSWORD },
      ];
      const answers: Array<{ status: number; body: unknown }> = [];
      for (const attempt of attempts) {
        answers.push(
          await thrownResponse(service.passwordLogin(attempt, fakeRes())),
        );
      }

      expect(answers[0].status).toBe(401);
      for (const answer of answers) expect(answer).toEqual(answers[0]);
      expect(JSON.stringify(answers[0])).not.toContain(PASSWORD);

      const ok = await service.passwordLogin(
        { email: 'ok@example.com', password: PASSWORD },
        fakeRes(),
      );
      expect(ok.user.email).toBe('ok@example.com');
    });

    it('refuses Google tokens that do not say the e-mail is verified', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          sub: 'g-3',
          email: 'g@example.com',
          email_verified: true,
        }),
      });
      await service.googleLogin({ idToken: 'x' }, fakeReq(), fakeRes());
      expect(db.byEmail('g@example.com')).toBeDefined();

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({ sub: 'g-4', email: 'h@example.com' }),
      });
      await expect(
        service.googleLogin({ idToken: 'x' }, fakeReq(), fakeRes()),
      ).rejects.toMatchObject({ status: 401 });
      expect(db.byEmail('h@example.com')).toBeUndefined();
    });
  });

  describe('set or change password', () => {
    const NEW_PASSWORD = 'brand new pass 7';
    const nowSeconds = () => Math.floor(Date.now() / 1000);
    const access = (
      extra: PasswordChangeClaims = {},
    ): PasswordChangeClaims => ({
      tokenType: 'access',
      amr: 'google',
      authAt: nowSeconds(),
      ...extra,
    });

    const member = async (withPassword: boolean) =>
      db.add({
        email: NORMALIZED,
        password_hash: withPassword ? await hash(PASSWORD, 4) : null,
      });

    it('lets a member without a password set one with no current password', async () => {
      const row = await member(false);
      const res = fakeRes();

      const out = await service.setPassword(
        row.id,
        access(),
        { password: NEW_PASSWORD },
        res,
      );

      expect(out.hasPassword).toBe(true);
      expect(
        await compare(NEW_PASSWORD, db.byEmail(NORMALIZED)!.password_hash),
      ).toBe(true);
      expect(JSON.stringify(out)).not.toMatch(/\$2[aby]\$/);
      expect(res.cookie).toHaveBeenCalled();
    });

    it('asks for the current password when one exists', async () => {
      const row = await member(true);

      const missing = await thrownResponse(
        service.setPassword(
          row.id,
          access(),
          { password: NEW_PASSWORD },
          fakeRes(),
        ),
      );
      expect(missing).toMatchObject({
        status: 403,
        body: { code: 'CURRENT_PASSWORD_REQUIRED' },
      });

      const wrong = await thrownResponse(
        service.setPassword(
          row.id,
          access(),
          { password: NEW_PASSWORD, currentPassword: 'wrong password 1' },
          fakeRes(),
        ),
      );
      expect(wrong).toMatchObject({
        status: 403,
        body: { code: 'CURRENT_PASSWORD_WRONG' },
      });

      await service.setPassword(
        row.id,
        access(),
        { password: NEW_PASSWORD, currentPassword: PASSWORD },
        fakeRes(),
      );
      expect(
        await compare(NEW_PASSWORD, db.byEmail(NORMALIZED)!.password_hash),
      ).toBe(true);
    });

    it('allows no current password only within 15 minutes of an e-mail link sign-in', async () => {
      const row = await member(true);
      const link = (age: number, extra: PasswordChangeClaims = {}) =>
        access({ amr: 'link', authAt: nowSeconds() - age, ...extra });

      await service.setPassword(
        row.id,
        link(60),
        { password: NEW_PASSWORD },
        fakeRes(),
      );
      expect(
        await compare(NEW_PASSWORD, db.byEmail(NORMALIZED)!.password_hash),
      ).toBe(true);

      const stale = await thrownResponse(
        service.setPassword(
          row.id,
          link(16 * 60),
          { password: 'another pass 33' },
          fakeRes(),
        ),
      );
      expect(stale.body).toMatchObject({ code: 'CURRENT_PASSWORD_REQUIRED' });

      const refreshTokenUsed = await thrownResponse(
        service.setPassword(
          row.id,
          link(60, { tokenType: 'refresh' }),
          { password: 'another pass 33' },
          fakeRes(),
        ),
      );
      expect(refreshTokenUsed.body).toMatchObject({
        code: 'CURRENT_PASSWORD_REQUIRED',
      });

      const passwordSession = await thrownResponse(
        service.setPassword(
          row.id,
          access({ amr: 'password' }),
          { password: 'another pass 33' },
          fakeRes(),
        ),
      );
      expect(passwordSession.body).toMatchObject({
        code: 'CURRENT_PASSWORD_REQUIRED',
      });
    });

    it('keeps how the session started when refreshing, so the 15 minute window cannot be extended', async () => {
      const row = await member(true);
      const res = fakeRes();
      const authAt = nowSeconds() - 120;
      await service.setPassword(
        row.id,
        access({ amr: 'link', authAt }),
        { password: NEW_PASSWORD },
        res,
      );
      const refreshToken = res.cookie.mock.calls[0][1] as string;

      const refreshed = await service.refresh(
        {},
        { cookies: { cherryRefreshToken: refreshToken }, headers: {} } as any,
        fakeRes(),
      );
      const claims = new JwtService().decode(refreshed.accessToken) as any;
      expect(claims.amr).toBe('link');
      expect(claims.authAt).toBe(authAt);
    });

    it('replaces the stored refresh token so other devices are signed out', async () => {
      const row = await member(false);
      const previous = 'old-refresh-token';
      await redis.set(`cherry:auth:refresh:${row.id}`, previous);

      await service.setPassword(
        row.id,
        access(),
        { password: NEW_PASSWORD },
        fakeRes(),
      );

      const stored = await redis.getString(`cherry:auth:refresh:${row.id}`);
      expect(stored).not.toBe(previous);
    });

    it('rejects a password that breaks the policy with a code the web can map', async () => {
      const row = db.add({ email: 'owner1@example.com' });
      const out = await thrownResponse(
        service.setPassword(
          row.id,
          access(),
          { password: 'Owner1@example.com' },
          fakeRes(),
        ),
      );
      expect(out).toMatchObject({
        status: 400,
        body: {
          errors: [{ path: 'password', message: 'PASSWORD_SAME_AS_EMAIL' }],
        },
      });
    });
  });

  describe('me', () => {
    it('reports whether a password is set and never the hash', async () => {
      const row = db.add({
        email: NORMALIZED,
        password_hash: await hash(PASSWORD, 4),
      });
      const me = await service.me(row.id);
      expect(me.hasPassword).toBe(true);
      expect(JSON.stringify(me)).not.toMatch(/\$2[aby]\$|password_hash/);
    });
  });
});

describe('password policy', () => {
  it.each([
    ['short1a', 'PASSWORD_TOO_SHORT'],
    ['한글7', 'PASSWORD_TOO_SHORT'],
    ['가나다라1', 'PASSWORD_TOO_SHORT'],
    ['only letters here', 'PASSWORD_NEEDS_LETTER_AND_DIGIT'],
    ['123456789012', 'PASSWORD_NEEDS_LETTER_AND_DIGIT'],
    ['a1'.repeat(37), 'PASSWORD_TOO_LONG'],
    ['가나다라마바사아자1'.repeat(3), 'PASSWORD_TOO_LONG'],
  ])('rejects %s with %s', (password, code) => {
    expect(passwordViolation(password)).toBe(code);
  });

  it.each(['abcdefg1', 'a1'.repeat(36), '비밀번호가좋아요1', 'pass word 9'])(
    'accepts %s',
    (password) => {
      expect(passwordViolation(password)).toBeNull();
    },
  );

  it('rejects the e-mail address as a password, ignoring case', () => {
    expect(passwordViolation('Owner1@example.com', 'owner1@EXAMPLE.com')).toBe(
      'PASSWORD_SAME_AS_EMAIL',
    );
  });

  it('puts the rule codes in the zod issues the validation pipe returns', () => {
    const result = SetPasswordDto.schema.safeParse({ password: 'short' });
    expect(result.success).toBe(false);
    expect(
      result.success ? [] : result.error.issues.map((issue) => issue.message),
    ).toContain('PASSWORD_TOO_SHORT');

    expect(
      SetPasswordDto.schema.safeParse({ password: 'good pass 12' }).success,
    ).toBe(true);
  });
});

describe('an API deployed before the password_hash migration', () => {
  let db: FakeAppUserDb;
  let service: AppUserAuthService;

  beforeEach(() => {
    mailer.mockReset();
    mockVerifyIdToken.mockReset();
    process.env.GOOGLE_CLIENT_ID = 'test-client';
    db = new FakeAppUserDb({ missingColumns: ['password_hash'] });
    service = new AppUserAuthService(
      db.knex as any,
      new JwtService(),
      new FakeRedis() as any,
    );
  });

  it('still serves link sign-up and sign-in, Google, refresh and /me', async () => {
    await service.signin(
      { email: EMAIL, from: 'main', intent: 'signup' },
      fakeReq(),
    );
    const link = sentLink();
    const res = fakeRes();
    const session = await service.login(
      {
        email: link.searchParams.get('email')!,
        signInToken: link.searchParams.get('token')!,
      },
      fakeReq(),
      res,
    );
    expect(await service.me(session.user.id)).toMatchObject({
      email: NORMALIZED,
      hasPassword: false,
    });

    const refreshToken = res.cookie.mock.calls[0][1] as string;
    const refreshed = await service.refresh(
      {},
      { cookies: { cherryRefreshToken: refreshToken }, headers: {} } as any,
      fakeRes(),
    );
    expect(refreshed.accessToken).toEqual(expect.any(String));

    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'g-9',
        email: 'g@example.com',
        email_verified: true,
      }),
    });
    const google = await service.googleLogin(
      { idToken: 'x' },
      fakeReq(),
      fakeRes(),
    );
    expect(google.user.email).toBe('g@example.com');
  });

  it('answers password sign-in with the usual 401 and fails only the password write', async () => {
    const row = db.add({ email: NORMALIZED });
    await expect(
      service.passwordLogin({ email: EMAIL, password: PASSWORD }, fakeRes()),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      service.setPassword(
        row.id,
        { tokenType: 'access', amr: 'link', authAt: Math.floor(Date.now() / 1000) },
        { password: 'brand new pass 7' },
        fakeRes(),
      ),
    ).rejects.toMatchObject({ code: '42703' });
  });
});
