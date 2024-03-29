import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import * as dotenv from 'dotenv';
import { JwtRefreshTokenStrategy } from './jwt-refresh-token.strategy';
import { EmailModule } from 'src/email/email.module';
dotenv.config();

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtRefreshTokenStrategy],
  imports: [
    PrismaModule,
    forwardRef(() => UserModule),
    forwardRef(() => EmailModule),
    JwtModule,
    PassportModule,
  ],
  exports: [AuthService],
})
export class AuthModule {}
