import { Controller, Post, Body, Res, Get, UseGuards, Req, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import type { Response, Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  async register(@Body() dto: RegisterDto) {
    this.logger.log(`Registering new user with email: ${dto.email}`);
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user and set HTTP-only cookie' })
  @ApiResponse({ status: 201, description: 'User successfully logged in.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    this.logger.log(`User login attempt with email: ${dto.email}`);
    const { token, user } = await this.authService.login(dto);
    
    this.logger.log(`User ${user.id} logged in successfully`);
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
     // domain: '.punithcodes.uk',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    });

    return user;
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout user and clear cookie' })
  @ApiResponse({ status: 201, description: 'User successfully logged out.' })
  async logout(@Res({ passthrough: true }) res: Response) {
    this.logger.log(`User logging out`);
    res.clearCookie('jwt');
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiCookieAuth('jwt')
  @ApiOperation({ summary: 'Get current logged in user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getProfile(@Req() req: any) {
    this.logger.log(`Fetching profile for user ID: ${req.user.id}`);
    return req.user;
  }
}

