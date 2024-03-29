import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoginUserDto } from './dto/login-user.dto';
import { Request, Response } from 'express';
import { AuthRequest, UserJwtPayload } from './jwt.strategy';
import JwtRefreshGuard from './jwt-refresh.guard';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UserService))
    @Inject(forwardRef(() => EmailService))
    private userService: UserService,
    private jwt: JwtService,
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async login(userDto: LoginUserDto, req: Request, res: Response) {
    const { email, password } = userDto;
    const candidate = await this.prisma.user.findUnique({
      where: { email: email },
    });

    if (!candidate) {
      throw new BadRequestException('Wrong credentials');
    }

    const isMatch = await this.comparePasswords(password, candidate.password);

    if (!isMatch) {
      throw new BadRequestException('Wrong credentials');
    }

    if (!candidate.isEmailConfirmed) {
      await this.emailService.resendConfirmationLink(candidate.id);

      throw new HttpException(
        'Please confirm email adress',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const accessToken = this.getAccessToken(candidate.id);
    const refreshToken = this.getRefreshToken(candidate.id);

    await this.setCurrentRefreshToken(refreshToken, candidate.id);

    return res.send({
      accessToken: accessToken,
      refreshToken: refreshToken,
      photo: candidate.image,
      fullName: candidate.fullName,
      userId: candidate.id,
    });
  }

  getRefreshToken(id: number) {
    const payload = { id };
    const token = this.jwt.sign(payload, {
      secret: process.env.JWT_REFRESH_TOKEN_SECRET,
      expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRATION_TIME,
    });

    return token;
  }

  getAccessToken(id: number) {
    const payload = { id };
    const token = this.jwt.sign(payload, {
      secret: process.env.JWT_ACCESS_TOKEN_SECRET,
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION_TIME,
    });

    return token;
  }

  async setCurrentRefreshToken(refreshToken: string, userId: number) {
    const currentHashedRefreshToken = await this.hashPassword(refreshToken);
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        currentHashedRefreshToken,
      },
    });
  }

  async register(userDto: CreateUserDto) {
    const candidate = await this.prisma.user.findUnique({
      where: { email: userDto.email },
    });

    if (candidate) {
      throw new BadRequestException('User with this email already exists');
    }

    const hashedPassword = await this.hashPassword(userDto.password);

    await this.emailService.sendVerificationLink(userDto.email);

    await this.userService.createUser({
      ...userDto,
      password: hashedPassword,
    });

    return { message: 'User succesfuly registered' };
  }

  async signout(req: Request, res: Response) {
    return res.send({ message: 'Succesfuly signed out' });
  }

  async hashPassword(password: string): Promise<string> {
    const rounds = 5;

    return await bcrypt.hash(password, rounds);
  }

  async comparePasswords(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  async verifyAndReturnUser(token: string) {
    const jwtToken = token;

    if (!jwtToken) {
      throw new BadRequestException('No token provided');
    }

    if (token) {
      const payload = this.jwt.verify(jwtToken, {
        secret: process.env.JWT_ACCESS_TOKEN_SECRET,
      });

      if (!payload) {
        throw new BadRequestException('Token expired');
      }

      if (payload) {
        const user = this.prisma.user.findUnique({
          where: {
            id: payload.id,
          },
        });

        if (!user) {
          throw new BadRequestException('No user');
        }

        return user;
      }
    }
  }

  async refresh(userId: number) {
    const accessToken = this.getAccessToken(userId);
    const refreshToken = this.getRefreshToken(userId);

    await this.setCurrentRefreshToken(refreshToken, userId);

    return {
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
  }

  async me(userId: number) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
      },
    });

    return {
      photo: user.image,
      fullName: user.fullName,
      userId: user.id,
    };
  }

  async logout(userId: number) {
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        currentHashedRefreshToken: null,
      },
    });
  }
}
