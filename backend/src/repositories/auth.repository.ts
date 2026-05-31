import { createHash } from 'crypto';
import { executeSql, one } from '../common/db/sql';

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

export type AuthCodePurpose = 'register' | 'reset_password';

type UserRow = {
  id: number;
  user_uuid: string;
  email: string;
  password_salt: string | null;
  password_hash: string | null;
};

type LoginCodeRow = {
  id: number;
  email: string;
  purpose: AuthCodePurpose;
  code_hash: string;
  expires_at: Date;
};

type TokenUserRow = {
  user_uuid: string;
};

export class AuthRepository {
  public async insertLoginCode(
    email: string,
    purpose: AuthCodePurpose,
    code: string,
    expiresAt: Date
  ): Promise<void> {
    await executeSql('DELETE FROM login_codes WHERE email = ? AND purpose = ?', [email, purpose]);

    await executeSql(
      `INSERT INTO login_codes (email, purpose, code_hash, expires_at)
       VALUES (?, ?, SHA2(?, 256), ?)` ,
      [email, purpose, code, expiresAt]
    );
  }

  public async getValidLoginCode(
    email: string,
    purpose: AuthCodePurpose
  ): Promise<LoginCodeRow | undefined> {
    return one<LoginCodeRow>(
      `SELECT id, email, purpose, code_hash, expires_at
       FROM login_codes
       WHERE email = ? AND purpose = ? AND consumed_at IS NULL
       ORDER BY id DESC
       LIMIT 1`,
      [email, purpose]
    );
  }

  public async consumeLoginCode(id: number): Promise<void> {
    await executeSql('UPDATE login_codes SET consumed_at = CURRENT_TIMESTAMP(3) WHERE id = ?', [id]);
  }

  public async findUserByEmail(email: string): Promise<UserRow | undefined> {
    return one<UserRow>(
      `SELECT id, user_uuid, email, password_salt, password_hash
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );
  }

  public async findUserByUuid(userUuid: string): Promise<UserRow | undefined> {
    return one<UserRow>(
      `SELECT id, user_uuid, email, password_salt, password_hash
       FROM users
       WHERE user_uuid = ?
       LIMIT 1`,
      [userUuid]
    );
  }

  public async insertUser(userUuid: string, email: string, passwordSalt: string, passwordHash: string): Promise<UserRow> {
    await executeSql(
      `INSERT INTO users (user_uuid, email, password_salt, password_hash)
       VALUES (?, ?, ?, ?)`,
      [userUuid, email, passwordSalt, passwordHash]
    );

    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new Error('insert user failed');
    }
    return user;
  }

  public async updateUserPassword(userId: number, passwordSalt: string, passwordHash: string): Promise<void> {
    await executeSql(
      `UPDATE users
       SET password_salt = ?, password_hash = ?
       WHERE id = ?`,
      [passwordSalt, passwordHash, userId]
    );
  }

  public async saveToken(token: string, userId: number): Promise<void> {
    const tokenHash = hashToken(token);
    await executeSql(
      `INSERT INTO auth_tokens (token_hash, user_id, expires_at)
       VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 30 DAY))`,
      [tokenHash, userId]
    );
  }

  public async resolveUserUuidByToken(token: string): Promise<string | undefined> {
    const tokenHash = hashToken(token);

    const row = await one<TokenUserRow>(
      `SELECT u.user_uuid
       FROM auth_tokens t
       INNER JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = ?
         AND (t.expires_at IS NULL OR t.expires_at > CURRENT_TIMESTAMP(3))
       LIMIT 1`,
      [tokenHash]
    );

    return row?.user_uuid;
  }
}

export const authRepository = new AuthRepository();
