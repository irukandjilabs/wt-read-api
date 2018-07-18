/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
const { expect } = require('chai');
const request = require('supertest');
const config = require('../../src/config');

describe('API', function () {
  let server;
  beforeEach(() => {
    server = require('../../src/index');
  });
  afterEach(() => {
    server.close();
  });

  it('GET /', async () => {
    await request(server)
      .get('/')
      .expect((res) => {
        expect(res.body).to.have.property('docs');
        expect(res.body).to.have.property('info');
        expect(res.body).to.have.property('version');
      })
      .expect(200);
  });

  it('GET /docs', async () => {
    await request(server)
      .get('/docs/')
      .expect('content-type', /html/i)
      .expect((res) => {
        expect(res.text).to.not.be.empty;
      })
      .expect(200);
  });

  it('GET /random-endpoint', async () => {
    await request(server)
      .get('/random-endpoint')
      .expect('content-type', /json/i)
      .expect((res) => {
        expect(res.body).to.have.property('code', '#notFound');
      })
      .expect(404);
  });

  it('GET with not whitelisted ip. Expect #whiteList', async () => {
    config.whiteList = ['11.22.33.44'];
    await request(server)
      .get('/')
      .expect((res) => {
        expect(res.body).to.have.property('code', '#whiteList');
      })
      .expect(403);
  });

  it('Allow all ips with empty whiteList', async () => {
    config.whiteList = [];
    await request(server)
      .get('/')
      .expect(200);
  });
});