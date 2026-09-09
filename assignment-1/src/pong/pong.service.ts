import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { PingService } from '../ping/ping.service';

@Injectable()
export class PongService {
  constructor(
    @Inject(forwardRef(() => PingService))
    private readonly pingService: PingService,
  ) {}

  identify(): string {
    return 'pong';
  }

  pong(): string {
    return `pong -> ${this.pingService.identify()}`;
  }
}
