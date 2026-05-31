import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { env } from '../../config/env';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;

const getKey = (): Buffer => {
  const seed = env.secretKey || 'dev-secret-key-change-me';
  return createHash('sha256').update(seed).digest();
};

export const encryptText = (plainText: string): string => {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}.${authTag.toString('hex')}.${encrypted.toString('hex')}`;
};

export const decryptText = (cipherText: string): string => {
  const [ivHex, tagHex, dataHex] = cipherText.split('.');
  if (!ivHex || !tagHex || !dataHex) {
    return '';
  }

  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final()
  ]);
  return decrypted.toString('utf8');
};
