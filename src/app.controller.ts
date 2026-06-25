import { Controller, Get } from '@nestjs/common';
// eslint-disable-next-line prettier/prettier
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  // eslint-disable-next-line prettier/prettier
}
