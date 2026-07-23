import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class LoginBlockGuard implements CanActivate {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const rawIp = request.ip || request.headers['x-forwarded-for'];
    const ip = Array.isArray(rawIp) ? rawIp[0] : (rawIp ?? '');

    const blockState = await this.cacheManager.get<{ blockUntil: number }>(
      `login_block:${ip}`,
    );

    if (blockState) {
      const remainingSeconds = Math.ceil(
        (blockState.blockUntil - Date.now()) / 1000,
      );
      if (remainingSeconds > 0) {
        throw new ForbiddenException(
          `Too many login attempts. Please wait for some time. Try again in ${remainingSeconds} second(s).`,
        );
      }
    }

    return true;
  }
}
