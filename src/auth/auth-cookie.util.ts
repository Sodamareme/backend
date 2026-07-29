import { Request, Response } from 'express';

export const AUTH_COOKIE_NAME = 'sa_access_token';

export function buildAuthCookieOptions(req?: Request) {
  const forwardedProto = req?.headers['x-forwarded-proto'];
  const isSecure =
    forwardedProto === 'https' ||
    req?.protocol === 'https' ||
    process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
  };
}

export function setAuthCookie(res: Response, token: string, req?: Request) {
  res.cookie(AUTH_COOKIE_NAME, token, buildAuthCookieOptions(req));
}

export function clearAuthCookie(res: Response, req?: Request) {
  res.clearCookie(AUTH_COOKIE_NAME, buildAuthCookieOptions(req));
}
