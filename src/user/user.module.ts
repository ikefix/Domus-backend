import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { SessionService, EmailingService } from 'src/common/services';

@Module({
  controllers: [UserController],
  providers: [UserService, SessionService, EmailingService],
})
export class UserModule {}
