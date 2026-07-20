import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('returns API status', () => {
      expect(appController.getRoot()).toEqual({
        app: 'PulseDock API',
        status: 'running',
      });
    });
  });

  describe('health', () => {
    it('returns service health', () => {
      const health = appController.getHealth();

      expect(health).toMatchObject({
        status: 'ok',
        service: 'pulsedock-api',
      });
      expect(typeof health.timestamp).toBe('string');
    });
  });
});
