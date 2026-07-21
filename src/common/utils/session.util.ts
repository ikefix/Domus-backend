import { Request } from 'express';


export const extractIp = (req: Request): string => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
    return ip.trim();
  }
  return req.ip || req.socket?.remoteAddress || (req as any).connection?.remoteAddress || '';
};


export const createSession = (userAgent: string, ip: string) => {
  
};
