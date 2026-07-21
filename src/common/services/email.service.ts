import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';



@Injectable()
export class EmailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendOtp(
    email: string,
    code: string,
    useCase: string,
  ): Promise<'success' | 'failed'> {
    const isReset = useCase === 'forgot-pass';
    const subject = isReset ? 'Reset your password' : 'Your verification code';

    const message = isReset
      ? `Enter this code to reset your password: ${code}`
      : `Enter this code to sign in: ${code}`;

    try {
      const { error } = await this.resend.emails.send({
        from: process.env.EMAIL_FROM_DEFAULT || 'Auth <onboarding@resend.dev>',
        to: [email],
        subject: subject,
        html: `
          ${subject}<br><br>
          ${message}<br><br>
          <strong>${code}</strong><br><br>
          This code expires in 5 minutes.
        `,
      });

      if (error) {
        return 'failed';
      }

      return 'success';
    } catch {
      return 'failed';
    }
  }
}

export { EmailService as EmailingService };
