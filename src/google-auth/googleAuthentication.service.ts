import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { google, Auth } from 'googleapis';
import { UserService } from 'src/user/user.service';
import { User } from '@prisma/client';
import { AuthService } from 'src/auth/auth.service';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(
  process.env.GOOGLE_AUTH_CLIENT_ID,
  process.env.GOOGLE_AUTH_CLIENT_SECRET,
);

@Injectable()
export class GoogleAuthenticationService {
  oauthClient: Auth.OAuth2Client;
  constructor(
    private readonly usersService: UserService,
    private readonly authService: AuthService,
  ) {
    const clientID = process.env.GOOGLE_AUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_AUTH_CLIENT_SECRET;
    this.oauthClient = new google.auth.OAuth2(clientID, clientSecret);
  }
  async getDecodedOAuthJwtGoogle(token: string) {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_AUTH_CLIENT_ID,
    });

    return ticket.getPayload();
  }
  async authenticate(token: string) {
    const tokenInfo = await this.getDecodedOAuthJwtGoogle(token);

    const email = tokenInfo.email;
    const user = await this.usersService.getUserByEmail(email);

    if (user) {
      return this.handleRegisteredUser(user);
    }

    return this.registerUser(tokenInfo);
  }

  async registerUser(userData: Auth.TokenPayload) {
    const name = userData.name;
    const user = await this.usersService.createWithGoogle(
      userData.email,
      name,
      userData.picture,
    );
    return this.handleRegisteredUser(user);
  }

  async getCookiesForUser(user: User) {
    const accessToken = this.authService.getAccessToken(user.id);

    const refreshToken = this.authService.getRefreshToken(user.id);

    await this.authService.setCurrentRefreshToken(refreshToken, user.id);
    return {
      accessToken,
      refreshToken,
    };
  }

  async handleRegisteredUser(user: User) {
    if (!user.isRegisteredWithGoogle) {
      throw new UnauthorizedException();
    }
    const { accessToken, refreshToken } = await this.getCookiesForUser(user);
    return {
      accessToken,
      refreshToken,
      user,
    };
  }
}
