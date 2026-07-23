import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import deviceDetector from 'device-detector-js';

@Injectable()
export class BotDetectionGuard implements CanActivate {
  private readonly botDetector = new deviceDetector();

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const userAgent = request.headers['user-agent'] || '';

    const parsed = this.botDetector.parse(userAgent);

    const isBot = !!parsed.bot;

    if (isBot) {
      throw new ForbiddenException(
        'Access denied: Automated bots are not allowed.',
      );
    }

    return true;
  }
}
