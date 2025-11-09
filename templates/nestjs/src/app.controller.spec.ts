import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('root', () => {
    it('should return "Hello from {{PROJECT_NAME}}! 🎉"', () => {
      expect(appController.getHello()).toBe('Hello from {{PROJECT_NAME}}! 🎉');
    });
  });

  describe('health', () => {
    it('should return health status', () => {
      const health = appController.getHealth();
      expect(health).toHaveProperty('status', 'ok');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('uptime');
      expect(typeof health.uptime).toBe('number');
    });
  });

  describe('info', () => {
    it('should return application info', () => {
      const info = appController.getInfo();
      expect(info).toHaveProperty('name', '{{PROJECT_NAME}}');
      expect(info).toHaveProperty('description', '{{DESCRIPTION}}');
      expect(info).toHaveProperty('version', '1.0.0');
      expect(info).toHaveProperty('author', '{{AUTHOR}}');
      expect(info).toHaveProperty('startTime');
    });
  });
});