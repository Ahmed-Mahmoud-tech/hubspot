import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { EmailService } from '../services/email.service';
import { LocalAuthGuard } from '../auth/local-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ResendVerificationDto,
} from '../dto/auth.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private emailService: EmailService,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    this.logger.log(
      'Register request received:',
      JSON.stringify(registerDto, null, 2),
    );
    return this.authService.register(registerDto);
  }

  @Get('verify-email')
  async verifyEmail(@Query() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto.token);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @Post('resend-verification')
  async resendVerificationEmail(
    @Body() resendVerificationDto: ResendVerificationDto,
  ) {
    return this.authService.resendVerificationEmail(
      resendVerificationDto.email,
    );
  }

  @Post('test-email')
  async testEmail(@Body() body: any) {
    try {
      // Test connection first
      const isConnected = await this.emailService.testConnection();
      this.logger.log(
        `SMTP Connection test: ${isConnected ? 'PASSED' : 'FAILED'}`,
      );

      if (body.test === 'connection') {
        return {
          success: isConnected,
          message: isConnected
            ? 'SMTP connection successful'
            : 'SMTP connection failed',
        };
      }

      // Send test email
      if (body.to && body.subject && body.html) {
        await this.emailService.sendTestEmail(body.to, body.subject, body.html);
        this.logger.log(`Test email sent to ${body.to}`);
        return {
          success: true,
          message: `Test email sent successfully to ${body.to}`,
        };
      }

      return {
        success: false,
        message: 'Missing required fields: to, subject, html',
      };
    } catch (error) {
      this.logger.error('Test email failed:', error);
      return {
        success: false,
        message: `Test email failed: ${error.message}`,
      };
    }
  }
}
