import { INestApplication } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { jwtConstants } from 'src/common/constants/constants';
import { RedisService } from 'src/common/basic-service/redis.service';
import { RoleJwtStrategy } from 'src/common/role-jwt.strategy';
import sendEmail from 'src/utils/resend';
import { AppUserAuthService } from './app-user-auth.service';
import { AppUserController } from './app-user.controller';
import { AppUserService } from './app-user.service';
import { FakeAppUserDb, FakeRedis } from './fake-app-user-db.testing-spec';

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

const mailer = sendEmail as unknown as jest.Mock;

const EMAIL = 'member@example.com';
const PASSWORD = 'first password 1';
const CHANGED = 'second password 2';
const LINK_SET = 'third password 3';

describe('password login over HTTP (in-memory user table, no database)', () => {
  let app: INestApplication;
  let db: FakeAppUserDb;
  const bodies: string[] = [];

  const api = () => request(app.getHttpServer());
  const record = <T extends { text: string }>(res: T): T => {
    bodies.push(res.text);
    return res;
  };

  beforeAll(async () => {
    db = new FakeAppUserDb();
    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: jwtConstants.secret }),
      ],
      controllers: [AppUserController],
      providers: [
        AppUserService,
        AppUserAuthService,
        RoleJwtStrategy,
        { provide: 'KNEX_CONNECTION', useValue: db.knex },
        { provide: RedisService, useValue: new FakeRedis() },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useLogger(false);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('runs link sign-up, password set after the link, password sign-in and a change end to end', async () => {
    expect(
      record(
        await api()
          .post('/api/app-user/password/signup')
          .send({ email: EMAIL, password: PASSWORD }),
      ).status,
    ).toBe(404);

    const signup = record(
      await api()
        .post('/api/app-user/signin')
        .send({ email: EMAIL, from: 'main', intent: 'signup' }),
    );
    expect(signup.status).toBe(201);
    expect(Object.keys(signup.body)).toEqual(['expiresAt']);
    expect(db.byEmail(EMAIL)!.password_hash).toBeNull();

    const early = record(
      await api()
        .post('/api/app-user/password/login')
        .send({ email: EMAIL, password: PASSWORD }),
    );
    expect(early.status).toBe(401);

    const link = new URL(mailer.mock.calls[0][2] as string);
    expect(link.searchParams.get('intent')).toBe('signup');
    const confirm = record(
      await api()
        .post('/api/app-user/login')
        .send({
          email: link.searchParams.get('email'),
          signInToken: link.searchParams.get('token'),
        }),
    );
    expect(confirm.status).toBe(201);
    const linkToken: string = confirm.body.accessToken;

    const fresh = record(
      await api()
        .get('/api/app-user/me')
        .set('Authorization', `Bearer ${linkToken}`),
    );
    expect(fresh.body).toMatchObject({ email: EMAIL, hasPassword: false });

    const weak = record(
      await api()
        .post('/api/app-user/password')
        .set('Authorization', `Bearer ${linkToken}`)
        .send({ password: 'short' }),
    );
    expect(weak.status).toBe(400);
    expect(weak.body.errors).toEqual([
      { path: 'password', message: 'PASSWORD_TOO_SHORT' },
    ]);

    const set = record(
      await api()
        .post('/api/app-user/password')
        .set('Authorization', `Bearer ${linkToken}`)
        .send({ password: PASSWORD }),
    );
    expect(set.status).toBe(200);
    expect(set.body).toEqual({
      accessToken: expect.any(String),
      hasPassword: true,
    });

    const login = record(
      await api()
        .post('/api/app-user/password/login')
        .send({ email: EMAIL, password: PASSWORD }),
    );
    expect(login.status).toBe(201);
    expect(login.headers['set-cookie'][0]).toMatch(
      /cherryRefreshToken=.*HttpOnly/,
    );
    const passwordToken: string = login.body.accessToken;

    const wrong = record(
      await api()
        .post('/api/app-user/password/login')
        .send({ email: EMAIL, password: 'not the one 1' }),
    );
    const unknown = record(
      await api()
        .post('/api/app-user/password/login')
        .send({ email: 'nobody@example.com', password: PASSWORD }),
    );
    expect(wrong.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(early.body).toEqual(unknown.body);

    const me = record(
      await api()
        .get('/api/app-user/me')
        .set('Authorization', `Bearer ${passwordToken}`),
    );
    expect(me.body).toMatchObject({ email: EMAIL, hasPassword: true });

    expect(
      record(
        await api().post('/api/app-user/password').send({ password: CHANGED }),
      ).status,
    ).toBe(401);

    const noCurrent = record(
      await api()
        .post('/api/app-user/password')
        .set('Authorization', `Bearer ${passwordToken}`)
        .send({ password: CHANGED }),
    );
    expect(noCurrent.status).toBe(403);
    expect(noCurrent.body.code).toBe('CURRENT_PASSWORD_REQUIRED');

    const changed = record(
      await api()
        .post('/api/app-user/password')
        .set('Authorization', `Bearer ${passwordToken}`)
        .send({ password: CHANGED, currentPassword: PASSWORD }),
    );
    expect(changed.status).toBe(200);

    const oldPassword = record(
      await api()
        .post('/api/app-user/password/login')
        .send({ email: EMAIL, password: PASSWORD }),
    );
    expect(oldPassword.status).toBe(401);
    expect(
      record(
        await api()
          .post('/api/app-user/password/login')
          .send({ email: EMAIL, password: CHANGED }),
      ).status,
    ).toBe(201);

    const forgot = record(
      await api()
        .post('/api/app-user/password')
        .set('Authorization', `Bearer ${linkToken}`)
        .send({ password: LINK_SET }),
    );
    expect(forgot.status).toBe(200);
    expect(
      record(
        await api()
          .post('/api/app-user/password/login')
          .send({ email: EMAIL, password: LINK_SET }),
      ).status,
    ).toBe(201);
  });

  it('never put a password or a hash in any response body', () => {
    const everything = bodies.join('\n');
    for (const secret of [PASSWORD, CHANGED, LINK_SET, 'not the one 1']) {
      expect(everything).not.toContain(secret);
    }
    expect(everything).not.toMatch(/\$2[aby]\$/);
    expect(everything).not.toContain('password_hash');
  });
});
