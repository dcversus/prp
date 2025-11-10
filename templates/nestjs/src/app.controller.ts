import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get hello message' })
  @ApiResponse({ status: 200, description: 'Returns a greeting message.' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy.' })
  getHealth(): object {
    return this.appService.getHealth();
  }

  @Get('info')
  @ApiOperation({ summary: 'Get application info' })
  @ApiResponse({ status: 200, description: 'Returns application information.' })
  getInfo(): object {
    return this.appService.getInfo();
  }
}