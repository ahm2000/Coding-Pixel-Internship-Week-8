import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { PongService } from '../pong/pong.service';

@Injectable()
export class PingService {
  constructor(
    @Inject(forwardRef(() => PongService))
    private readonly pongService: PongService,
  ) {}

  identify(): string {
    return 'ping';
  }

  ping(): string {
    return `ping -> ${this.pongService.identify()}`;
  }
}
