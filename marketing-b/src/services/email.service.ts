import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  // constructor(private configService: ConfigService) {
  //   this.transporter = nodemailer.createTransport({
  //     service: 'gmail',
  //     host: this.configService.get<string>('EMAIL_HOST'),
  //     port: 587,
  //     secure: false, // true for 465, false for other ports
  //     auth: {
  //       user: this.configService.get<string>('EMAIL_USER'),
  //       pass: this.configService.get<string>('EMAIL_PASSWORD'),
  //     },
  //     tls: {
  //       rejectUnauthorized: false,
  //     },
  //   });
  // }

  // constructor(private configService: ConfigService) {
  //   this.transporter = nodemailer.createTransport({
  //     host: this.configService.get<string>('EMAIL_HOST') || 'smtp.gmail.com',
  //     port: parseInt(this.configService.get<string>('EMAIL_PORT') || '587'),
  //     secure: false,
  //     auth: {
  //       user: this.configService.get<string>('EMAIL_USER'),
  //       pass: this.configService.get<string>('EMAIL_PASSWORD'),
  //     },
  //     connectionTimeout: 10000, // Add timeout settings
  //     socketTimeout: 10000,
  //     greetingTimeout: 10000,
  //     tls: {
  //       rejectUnauthorized: false,
  //     },
  //   });
  // }

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST'),
      port: parseInt(this.configService.get<string>('EMAIL_PORT') || '587'),
      secure: this.configService.get<string>('EMAIL_SECURE') === 'true',
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
      // Longer timeouts for better connection success
      connectionTimeout: 30000, // 30 seconds
      socketTimeout: 30000, // 30 seconds
      greetingTimeout: 30000, // 30 seconds,
      // tls: {
      //   rejectUnauthorized: false,
      //   ciphers: 'SSLv3',
      //   servername: this.configService.get<string>('EMAIL_HOST'),
      // },
      debug: true,
      logger: true,
      pool: true,
      maxConnections: 5,
      maxMessages: 10,
      // debug: this.configService.get<string>('NODE_ENV') === 'development',
      // logger: this.configService.get<string>('NODE_ENV') === 'development',
    });
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM'),
      to: email,
      subject: 'Email Verification - HubSpot Duplicate Management',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to HubSpot Duplicate Management System</h2>
          <p>Please click the button below to verify your email address:</p>
          <a href="${verificationUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #007bff; 
                    color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
            Verify Email
          </a>
          <p>Or copy and paste this link in your browser:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p>This link will expire in 24 hours.</p>
        </div>
      `,
    };

    await this.sendEmailWithRetry(mailOptions);
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM'),
      to: email,
      subject: 'Password Reset - HubSpot Duplicate Management',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>You requested a password reset. Click the button below to reset your password:</p>
          <a href="${resetUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #dc3545; 
                    color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
            Reset Password
          </a>
          <p>Or copy and paste this link in your browser:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
    };

    await this.sendEmailWithRetry(mailOptions);
  }
  async sendPlanEndingSoonEmail(
    email: string,
    billingEndDate: Date,
  ): Promise<void> {
    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM'),
      to: email,
      subject: 'Your Plan Will Expire Soon',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 32px 24px; border-radius: 8px; border: 1px solid #eee;">
          <h2 style="color: #d9534f;">Plan Expiry Reminder</h2>
          <p style="font-size: 16px;">Hello,</p>
          <p style="font-size: 16px;">We wanted to let you know that your current plan will <b style="color: #d9534f;">expire on <span style='font-size:18px;'>${billingEndDate.toLocaleDateString()}</span></b>.</p>
          <p style="font-size: 16px;">To ensure uninterrupted access to our services, please renew your plan before the expiry date.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${this.configService.get<string>('FRONTEND_URL')}/dashboard" style="display: inline-block; padding: 14px 32px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold;">Renew Now</a>
          </div>
          <p style="font-size: 15px; color: #555;">If you have already renewed, please disregard this message.</p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 13px; color: #bbb;">Thank you for choosing our service!</p>
        </div>
      `,
    };
    await this.sendEmailWithRetry(mailOptions);
  }

  // Test method to verify SMTP connection
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('SMTP connection successful');
      return true;
    } catch (error) {
      console.error('SMTP connection failed:', error);
      return false;
    }
  }

  // Test email sending method
  async sendTestEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM'),
      to,
      subject,
      html,
    };

    await this.sendEmailWithRetry(mailOptions);
  }

  // Retry logic for sending emails
  private async sendEmailWithRetry(
    mailOptions: any,
    maxRetries: number = 3,
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `📧 Email attempt ${attempt}/${maxRetries} to ${mailOptions.to}`,
        );
        await this.transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully on attempt ${attempt}`);
        return;
      } catch (error) {
        lastError = error as Error;
        console.error(
          `❌ Email attempt ${attempt}/${maxRetries} failed:`,
          error,
        );

        // If it's a connection timeout, wait before retrying
        if (
          attempt < maxRetries &&
          (lastError?.message?.includes('timeout') ||
            lastError?.message?.includes('ETIMEDOUT') ||
            lastError?.message?.includes('ECONNREFUSED'))
        ) {
          const delay = attempt * 2000; // 2s, 4s, 6s delays
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `Failed to send email after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
    );
  }
}
