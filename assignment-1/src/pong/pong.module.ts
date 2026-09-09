import { Module, forwardRef } from '@nestjs/common';
import { PingModule } from '../ping/ping.module';
import { PongService } from './pong.service';

@Module({
  imports: [forwardRef(() => PingModule)],
  providers: [PongService],
  exports: [PongService],
})
export class PongModule {}
