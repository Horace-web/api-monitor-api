import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

/**
 * Auth Module
 *
 * Handles user authentication and JWT token management.
 * This module will implement:
 * - User login and registration
 * - JWT token generation and validation
 * - Authentication strategies (JWT, local)
 *
 * Dependencies:
 * - UsersModule (for user data access)
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
      signOptions: { expiresIn: process.env.JWT_EXPIRATION || '7d' },
    }),
  ],
})
export class AuthModule {}
