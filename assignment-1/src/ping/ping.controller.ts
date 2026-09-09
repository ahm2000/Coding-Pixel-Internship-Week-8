import { Controller, Get } from '@nestjs/common';
import { PingService } from './ping.service';
import { PongService } from '../pong/pong.service';

@Controller('ping')
export class PingController {
  constructor(
    private readonly pingService: PingService,
    private readonly pongService: PongService,
  ) {}

  @Get()
  getPingPong(): { ping: string; pong: string } {
    return { ping: this.pingService.ping(), pong: this.pongService.pong() };
  }
}
