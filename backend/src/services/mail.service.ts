import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

export class MailService {
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    this.transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass
      }
    });

    return this.transporter;
  }

  public isReady(): boolean {
    return Boolean(env.smtp.host && env.smtp.port && env.smtp.user && env.smtp.pass && env.smtp.from);
  }

  public async sendVerificationCode(params: {
    to: string;
    purpose: 'register' | 'reset_password';
    code: string;
    expiresInMinutes: number;
  }): Promise<void> {
    if (!this.isReady()) {
      throw new Error('smtp config incomplete');
    }

    const purposeText = params.purpose === 'register' ? '注册账号' : '重置密码';

    await this.getTransporter().sendMail({
      from: env.smtp.from,
      to: params.to,
      subject: `AI PPT 验证码 - ${purposeText}`,
      text: `你正在${purposeText}，验证码为：${params.code}，${params.expiresInMinutes}分钟内有效。`,
      html: `<p>你正在${purposeText}。</p><p>验证码：<b>${params.code}</b></p><p>${params.expiresInMinutes}分钟内有效。</p>`
    });
  }
}

export const mailService = new MailService();
