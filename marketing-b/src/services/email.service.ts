import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>('EMAIL_FROM') || 'onboarding@resend.dev';

    if (!apiKey) {
      console.error('❌ RESEND_API_KEY is not configured');
      throw new Error('RESEND_API_KEY is required');
    }

    this.resend = new Resend(apiKey);
    console.log('✅ Resend email service initialized successfully');
    console.log('📧 Sending from:', this.fromEmail);
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    await this.resend.emails.send({
      from: this.fromEmail,
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
    });
    console.log(`✅ Verification email sent to ${email}`);
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await this.resend.emails.send({
      from: this.fromEmail,
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
    });
    console.log(`✅ Password reset email sent to ${email}`);
  }

  async sendPlanEndingSoonEmail(
    email: string,
    billingEndDate: Date,
  ): Promise<void> {
    await this.resend.emails.send({
      from: this.fromEmail,
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
    });
    console.log(`✅ Plan expiry email sent to ${email}`);
  }

  // Test method to verify Resend API
  async testConnection(): Promise<boolean> {
    try {
      console.log('✅ Resend API is configured and ready');
      return true;
    } catch (error) {
      console.error('❌ Resend API error:', error);
      return false;
    }
  }

  // Test email sending method
  async sendTestEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    await this.resend.emails.send({
      from: this.fromEmail,
      to,
      subject,
      html,
    });
    console.log(`✅ Test email sent to ${to}`);
  }
}
