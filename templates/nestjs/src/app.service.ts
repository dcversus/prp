import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly startTime = new Date();

  getHello(): string {
    return 'Hello from {{PROJECT_NAME}}! 🎉';
  }

  getHealth(): object {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime.getTime(),
    };
  }

  getInfo(): object {
    return {
      name: '{{PROJECT_NAME}}',
      description: '{{DESCRIPTION}}',
      version: '1.0.0',
      author: '{{AUTHOR}}',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      startTime: this.startTime.toISOString(),
    };
  }
}