import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { getJwtSecret } from '../jwt-secret';
import { AUTH_COOKIE_NAME } from '../auth-cookie.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: any) => {
          const rawCookieHeader = req?.headers?.cookie;
          if (typeof rawCookieHeader !== 'string' || rawCookieHeader.length === 0) {
            return null;
          }

          const cookies = rawCookieHeader.split(';');
          for (const cookie of cookies) {
            const [name, ...valueParts] = cookie.trim().split('=');
            if (name === AUTH_COOKIE_NAME) {
              return decodeURIComponent(valueParts.join('='));
            }
          }

          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: any) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
