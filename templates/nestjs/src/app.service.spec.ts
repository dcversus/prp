import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHello', () => {
    it('should return greeting message', () => {
      expect(service.getHello()).toBe('Hello from {{PROJECT_NAME}}! 🎉');
    });
  });

  describe('getHealth', () => {
    it('should return health status object', () => {
      const health = service.getHealth();
      expect(health).toHaveProperty('status', 'ok');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('uptime');
      expect(typeof health.uptime).toBe('number');
      expect(typeof health.timestamp).toBe('string');
    });
  });

  describe('getInfo', () => {
    it('should return application information', () => {
      const info = service.getInfo();
      expect(info).toHaveProperty('name', '{{PROJECT_NAME}}');
      expect(info).toHaveProperty('description', '{{DESCRIPTION}}');
      expect(info).toHaveProperty('version', '1.0.0');
      expect(info).toHaveProperty('author', '{{AUTHOR}}');
      expect(info).toHaveProperty('environment');
      expect(info).toHaveProperty('nodeVersion');
      expect(info).toHaveProperty('startTime');
    });
  });
});