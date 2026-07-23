import jwt from 'jsonwebtoken';

type signAccessTokenT = {
  userId: string;
  sessionId: string;
  type: 'access';
};

type signRefreshTokenT = {
  userId: string;
  sessionId: string;
  type: 'refresh';
};

type signTokenT = signAccessTokenT | signRefreshTokenT;

const signAccessToken = ({ userId, sessionId }: signAccessTokenT): string => {
  return jwt.sign(
    { userId, sessionId },
    process.env.ACCESS_TOKEN_SK ?? 'happydada',
    {
      expiresIn: '15m',
    },
  );
};

const signRefreshToken = ({ userId, sessionId }: signRefreshTokenT): string => {
  return jwt.sign(
    { userId, sessionId },
    process.env.REFRESH_TOKEN_SK ?? 'happyyadda',
    {
      expiresIn: '7d',
    },
  );
};

const signJwt = (args: signTokenT): string => {
  switch (args.type) {
    case 'access':
      return signAccessToken(args);
    case 'refresh':
      return signRefreshToken(args);
  }
};

export const signGoogleStateToken = (ip: string): string => {
  return jwt.sign(
    { ip },
    process.env.GOOGLE_STATE_SECRET ?? 'google-state-secret',
    {
      expiresIn: '2h',
    },
  );
};

export const verifyGoogleStateToken = (token: string, currentIp: string): boolean => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.GOOGLE_STATE_SECRET ?? 'google-state-secret',
    ) as { ip: string };
    return decoded.ip === currentIp;
  } catch (error) {
    return false;
  }
};

export default signJwt;
