import type { Response } from 'express';

type PayloadT = {
  refresh_token: string;
  access_token: string;
  res: Response;
};

export const Authenticate_With_Cookie = ({
  res,
  refresh_token,
  access_token,
}: PayloadT) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie(process.env.ACCESS_COOKIE_NAME ?? 'happydada', access_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie(process.env.REFRESH_COOKIE_NAME ?? 'hayyya', refresh_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};
