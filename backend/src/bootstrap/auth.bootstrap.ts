import { authService } from '../services/auth.service';

const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = 'admin123';

export const bootstrapAuthData = async (): Promise<void> => {
  await authService.ensureUserWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD, {
    forceResetPassword: true
  });
  console.log(`[auth] ensured admin account: ${ADMIN_EMAIL}`);
};
