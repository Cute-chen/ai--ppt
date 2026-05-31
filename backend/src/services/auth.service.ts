import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { AppError } from '../common/errors/app-error';
import { newId } from '../common/utils/id';
import { nowIso } from '../common/utils/time';
import { AuthCodePurpose, authRepository } from '../repositories/auth.repository';
import { authCodeRateLimitService } from './auth-code-rate-limit.service';
import { mailService } from './mail.service';

const CODE_TTL_MS = 5 * 60 * 1000;
const PASSWORD_MIN_LEN = 6;

const isValidEmail = (email: string): boolean => /.+@.+\..+/.test(email);
const hashCode = (code: string): string => createHash('sha256').update(code).digest('hex');

const hashPassword = (password: string, salt: string): string => {
  return scryptSync(password, salt, 64).toString('hex');
};

const createPasswordDigest = (password: string): { salt: string; hash: string } => {
  const salt = randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  return { salt, hash };
};

const verifyPassword = (password: string, salt: string, passwordHash: string): boolean => {
  const actualHash = Buffer.from(hashPassword(password, salt), 'hex');
  const expectedHash = Buffer.from(passwordHash, 'hex');
  if (actualHash.length !== expectedHash.length) {
    return false;
  }
  return timingSafeEqual(actualHash, expectedHash);
};

const assertPassword = (password: string): void => {
  if (!password || password.length < PASSWORD_MIN_LEN) {
    throw new AppError(`password must be at least ${PASSWORD_MIN_LEN} characters`, 400);
  }
};

const assertPurpose = (purpose: string): AuthCodePurpose => {
  if (purpose !== 'register' && purpose !== 'reset_password') {
    throw new AppError('invalid code purpose', 400);
  }
  return purpose;
};

const verifyAndConsumeCode = async (
  email: string,
  purpose: AuthCodePurpose,
  code: string
): Promise<void> => {
  const normalizedCode = code.trim();
  if (!/^\d{6}$/.test(normalizedCode)) {
    throw new AppError('invalid code', 400);
  }

  const record = await authRepository.getValidLoginCode(email, purpose);
  if (!record) {
    throw new AppError('code not found', 400);
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    await authRepository.consumeLoginCode(record.id);
    throw new AppError('code expired', 400);
  }

  const codeOk = hashCode(normalizedCode) === String(record.code_hash);

  if (!codeOk) {
    throw new AppError('invalid code', 400);
  }

  await authRepository.consumeLoginCode(record.id);
};

export class AuthService {
  public async sendCode(email: string, rawPurpose: string): Promise<{ expiresAt: string }> {
    const purpose = assertPurpose(rawPurpose);

    if (!email || !isValidEmail(email)) {
      throw new AppError('invalid email', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await authRepository.findUserByEmail(normalizedEmail);

    if (purpose === 'register' && user) {
      throw new AppError('email already registered', 400);
    }

    if (purpose === 'reset_password' && !user) {
      throw new AppError('email not registered', 404);
    }

    await authCodeRateLimitService.assertCanSend(normalizedEmail, purpose);

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAtTs = Date.now() + CODE_TTL_MS;
    const expiresAtDate = new Date(expiresAtTs);
    const expiresAtIso = expiresAtDate.toISOString();

    await authRepository.insertLoginCode(normalizedEmail, purpose, code, expiresAtDate);

    try {
      await mailService.sendVerificationCode({
        to: normalizedEmail,
        purpose,
        code,
        expiresInMinutes: 5
      });
    } catch (error) {
      throw new AppError(
        `send email failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        500
      );
    }

    return {
      expiresAt: expiresAtIso
    };
  }

  public async register(email: string, code: string, password: string): Promise<{
    accessToken: string;
    user: { id: string; email: string };
    issuedAt: string;
  }> {
    if (!email || !isValidEmail(email)) {
      throw new AppError('invalid email', 400);
    }

    assertPassword(password);

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await authRepository.findUserByEmail(normalizedEmail);
    if (existing) {
      throw new AppError('email already registered', 400);
    }

    await verifyAndConsumeCode(normalizedEmail, 'register', code);

    const digest = createPasswordDigest(password);
    const user = await authRepository.insertUser(newId(), normalizedEmail, digest.salt, digest.hash);
    const token = `tk_${newId().replace(/-/g, '')}`;

    await authRepository.saveToken(token, user.id);

    return {
      accessToken: token,
      user: {
        id: user.user_uuid,
        email: user.email
      },
      issuedAt: nowIso()
    };
  }

  public async login(email: string, password: string): Promise<{
    accessToken: string;
    user: { id: string; email: string };
    issuedAt: string;
  }> {
    if (!email || !isValidEmail(email)) {
      throw new AppError('invalid email', 400);
    }

    assertPassword(password);

    const normalizedEmail = email.trim().toLowerCase();
    const user = await authRepository.findUserByEmail(normalizedEmail);
    if (!user || !user.password_salt || !user.password_hash) {
      throw new AppError('invalid email or password', 401);
    }

    const ok = verifyPassword(password, user.password_salt, user.password_hash);
    if (!ok) {
      throw new AppError('invalid email or password', 401);
    }

    const token = `tk_${newId().replace(/-/g, '')}`;
    await authRepository.saveToken(token, user.id);

    return {
      accessToken: token,
      user: {
        id: user.user_uuid,
        email: user.email
      },
      issuedAt: nowIso()
    };
  }

  public async forgotPassword(email: string, code: string, newPassword: string): Promise<{ success: true }> {
    if (!email || !isValidEmail(email)) {
      throw new AppError('invalid email', 400);
    }

    assertPassword(newPassword);

    const normalizedEmail = email.trim().toLowerCase();
    const user = await authRepository.findUserByEmail(normalizedEmail);
    if (!user) {
      throw new AppError('email not registered', 404);
    }

    await verifyAndConsumeCode(normalizedEmail, 'reset_password', code);

    const digest = createPasswordDigest(newPassword);
    await authRepository.updateUserPassword(user.id, digest.salt, digest.hash);

    return { success: true };
  }

  public async ensureUserWithPassword(
    email: string,
    password: string,
    options?: { forceResetPassword?: boolean }
  ): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await authRepository.findUserByEmail(normalizedEmail);

    const digest = createPasswordDigest(password);

    if (!existing) {
      await authRepository.insertUser(newId(), normalizedEmail, digest.salt, digest.hash);
      return;
    }

    if (options?.forceResetPassword || !existing.password_salt || !existing.password_hash) {
      await authRepository.updateUserPassword(existing.id, digest.salt, digest.hash);
    }
  }

  public async resolveUserByToken(token: string): Promise<string | undefined> {
    return authRepository.resolveUserUuidByToken(token);
  }

  public async getCurrentUser(userUuid: string): Promise<{ id: string; email: string }> {
    const user = await authRepository.findUserByUuid(userUuid);
    if (!user) {
      throw new AppError('user not found', 404);
    }

    return {
      id: user.user_uuid,
      email: user.email
    };
  }
}

export const authService = new AuthService();
