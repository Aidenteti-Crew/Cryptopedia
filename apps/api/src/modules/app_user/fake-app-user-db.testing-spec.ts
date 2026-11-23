import type { AppUserEntity } from './entity/app-user.entity';

type Row = Record<string, any>;

const lowerEmailSql = 'lower(email) = ?';

// Just enough of the knex builder for AppUserAuthService: one table, equality filters, null filters,
// first/update/insert, and the partial unique index on live e-mails. A column listed in `missing`
// acts like one a migration has not added yet: absent from rows, and an error when written or filtered.
class Query {
  private readonly tests: Array<(row: Row) => boolean> = [];

  constructor(
    private readonly rows: Row[],
    private readonly missing: ReadonlySet<string>,
  ) {}

  private touch(columns: string[]) {
    const absent = columns.find((column) => this.missing.has(column));
    if (absent)
      throw Object.assign(new Error(`column "${absent}" does not exist`), {
        code: '42703',
      });
  }

  whereRaw(sql: string, bindings: unknown[]) {
    if (sql !== lowerEmailSql)
      throw new Error(`unsupported raw filter: ${sql}`);
    const wanted = String(bindings[0]);
    this.tests.push((row) => String(row.email).toLowerCase() === wanted);
    return this;
  }

  where(columnOrObject: string | Row, value?: unknown) {
    const pairs =
      typeof columnOrObject === 'string'
        ? { [columnOrObject]: value }
        : columnOrObject;
    this.touch(Object.keys(pairs));
    for (const [column, expected] of Object.entries(pairs)) {
      this.tests.push((row) => row[column] === expected);
    }
    return this;
  }

  whereNull(column: string) {
    this.touch([column]);
    this.tests.push((row) => row[column] == null);
    return this;
  }

  private matching(): Row[] {
    return this.rows.filter((row) => this.tests.every((test) => test(row)));
  }

  async first() {
    const row = this.matching()[0];
    return row ? { ...row } : undefined;
  }

  async update(patch: Row) {
    this.touch(Object.keys(patch));
    const hits = this.matching();
    for (const row of hits) Object.assign(row, patch);
    return hits.length;
  }

  async insert(row: Row) {
    this.touch(Object.keys(row));
    const clash = this.rows.some(
      (other) =>
        other.revoked_at == null &&
        row.revoked_at == null &&
        String(other.email).toLowerCase() === String(row.email).toLowerCase(),
    );
    if (clash)
      throw Object.assign(new Error('duplicate key'), { code: '23505' });
    this.rows.push(
      withoutColumns(
        {
          google_sub: null,
          avatar_url: null,
          last_login_at: null,
          magic_token_hash: null,
          magic_token_expires_at: null,
          magic_token_consumed_at: null,
          password_hash: null,
          ...row,
        },
        this.missing,
      ),
    );
  }
}

function withoutColumns(row: Row, missing: ReadonlySet<string>): Row {
  return Object.fromEntries(
    Object.entries(row).filter(([column]) => !missing.has(column)),
  );
}

export class FakeAppUserDb {
  readonly rows: Row[] = [];
  private readonly missing: ReadonlySet<string>;

  constructor(options: { missingColumns?: string[] } = {}) {
    this.missing = new Set(options.missingColumns ?? []);
  }

  readonly knex = (table: string) => {
    if (table !== 'core.app_user') throw new Error(`unexpected table ${table}`);
    return new Query(this.rows, this.missing);
  };

  add(row: Partial<AppUserEntity> & { email: string }): Row {
    const now = new Date();
    const full = {
      id: `user-${this.rows.length + 1}`,
      name: null,
      subscription_tier: 'FREE',
      role: 'GENERAL',
      timezone: 'Asia/Seoul',
      is_active: true,
      google_sub: null,
      avatar_url: null,
      last_login_at: null,
      magic_token_hash: null,
      magic_token_expires_at: null,
      magic_token_consumed_at: null,
      password_hash: null,
      created_at: now,
      updated_at: now,
      revoked_at: null,
      ...row,
    };
    const stored = withoutColumns(full, this.missing);
    this.rows.push(stored);
    return stored;
  }

  byEmail(email: string): Row | undefined {
    return this.rows.find((row) => row.email === email);
  }
}

export class FakeRedis {
  readonly store = new Map<string, string>();

  async set(key: string, value: unknown) {
    this.store.set(key, String(value));
  }

  async getString(key: string) {
    return this.store.get(key) ?? null;
  }

  async delete(key: string) {
    this.store.delete(key);
  }
}
