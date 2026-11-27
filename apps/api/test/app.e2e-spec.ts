import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configurerApp } from './../src/configurer-app.js';

// Réglages communs de l'API : préfixe /api/v1 et adresse de santé.
describe('Application (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configurerApp(app);
    await app.init();
  });

  it('/api/v1/sante (GET) confirme que la base et Redis répondent', () => {
    return request(app.getHttpServer())
      .get('/api/v1/sante')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.info.base_de_donnees.status).toBe('up');
        expect(res.body.info.redis.status).toBe('up');
      });
  });

  it('rien ne répond sans le préfixe /api/v1 (404)', () => {
    return request(app.getHttpServer()).get('/sante').expect(404);
  });

  it('une adresse inconnue sous /api/v1 répond au format commun (404 INTROUVABLE)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/nexiste-pas')
      .expect(404);
    expect(res.body.code).toBe('INTROUVABLE');
  });

  afterEach(async () => {
    await app.close();
  });
});
