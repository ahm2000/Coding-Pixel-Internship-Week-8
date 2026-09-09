import { Module, forwardRef } from '@nestjs/common';
import { PongModule } from '../pong/pong.module';
import { PingService } from './ping.service';
import { PingController } from './ping.controller';

@Module({
  imports: [forwardRef(() => PongModule)],
  controllers: [PingController],
  providers: [PingService],
  exports: [PingService],
})
export class PingModule {}
