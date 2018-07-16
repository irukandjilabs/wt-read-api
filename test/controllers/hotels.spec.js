/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
const { expect } = require('chai');
const request = require('supertest');
const wtJsLibs = require('../../src/services/wt-js-libs');
const {
  deployIndex,
  deployFullHotel,
} = require('../../scripts/local-network');
const {
  HOTEL_DESCRIPTION,
  RATE_PLAN,
} = require('../utils/test-data');

const web3 = require('web3');

describe('Hotels', function () {
  let server;
  let wtLibsInstance, indexContract;
  beforeEach(async () => {
    server = require('../../src/index');
    const config = require('../../src/config');
    wtLibsInstance = wtJsLibs.getInstance();
    indexContract = await deployIndex();
    config.wtIndexAddress = indexContract.address;
  });

  afterEach(() => {
    server.close();
  });

  describe('GET /hotels', () => {
    beforeEach(async () => {
      await deployFullHotel(await wtLibsInstance.getOffChainDataClient('json'), indexContract, HOTEL_DESCRIPTION, RATE_PLAN);
      await deployFullHotel(await wtLibsInstance.getOffChainDataClient('json'), indexContract, HOTEL_DESCRIPTION, RATE_PLAN);
    });

    it('should return default fields for hotels', async () => {
      await request(server)
        .get('/hotels')
        .set('content-type', 'application/json')
        .set('accept', 'application/json')
        .expect((res) => {
          const { items } = res.body;
          expect(items.length).to.be.eql(2);

          items.forEach(hotel => {
            expect(hotel).to.have.property('id');
            expect(hotel).to.have.property('name');
            expect(hotel).to.have.property('location');
          });
        });
    });

    it('should apply limit', async () => {
      await request(server)
        .get('/hotels?limit=1')
        .set('content-type', 'application/json')
        .set('accept', 'application/json')
        .expect((res) => {
          const { items } = res.body;
          expect(items.length).to.be.eql(1);

          items.forEach(hotel => {
            expect(hotel).to.have.property('id');
            expect(hotel).to.have.property('name');
            expect(hotel).to.have.property('location');
          });
        });
    });

    it('should return all fields that a client asks for', async () => {
      const fields = [
        'managerAddress',
        'id',
        'name',
        'description',
        'location',
        'contacts',
        'address',
        'roomTypes',
        'timezone',
        'currency',
        'images',
        'amenities',
        'updatedAt',
      ];
      const query = `fields=${fields.join()}`;

      await request(server)
        .get(`/hotels?${query}`)
        .set('content-type', 'application/json')
        .set('accept', 'application/json')
        .expect((res) => {
          const { items } = res.body;
          expect(items.length).to.be.eql(2);
          items.forEach(hotel => {
            expect(hotel).to.have.all.keys(fields);
          });
        });
    });

    it('should return 422 #limitRange', async () => {
      const pagination = 'limit=-500&page=0';
      await request(server)
        .get(`/hotels?${pagination}`)
        .set('content-type', 'application/json')
        .set('accept', 'application/json')
        .expect((res) => {
          expect(res.body).to.have.property('code', '#limitRange');
        })
        .expect(422);
    });

    it('should return 422 #paginationLimit', async () => {
      const pagination = 'limit=15&page=1600';
      await request(server)
        .get(`/hotels?${pagination}`)
        .set('content-type', 'application/json')
        .set('accept', 'application/json')
        .expect((res) => {
          expect(res.body).to.have.property('code', '#paginationLimit');
        })
        .expect(422);
    });

    it('should return 422 #paginationFormat', async () => {
      const pagination = 'limit=1&page=zero';
      await request(server)
        .get(`/hotels?${pagination}`)
        .set('content-type', 'application/json')
        .set('accept', 'application/json')
        .expect((res) => {
          expect(res.body).to.have.property('code', '#paginationFormat');
        })
        .expect(422);
    });

    it('should return 422 #negativePage', async () => {
      const pagination = 'limit=1&page=-1';
      await request(server)
        .get(`/hotels?${pagination}`)
        .set('content-type', 'application/json')
        .set('accept', 'application/json')
        .expect((res) => {
          expect(res.body).to.have.property('code', '#negativePage');
        })
        .expect(422);
    });
  });

  describe('GET /hotels/:hotelAddress', () => {
    let address;
    beforeEach(async () => {
      address = await deployFullHotel(await wtLibsInstance.getOffChainDataClient('json'), indexContract, HOTEL_DESCRIPTION, RATE_PLAN);
      address = web3.utils.toChecksumAddress(address);
    });

    it('should return default fields', async () => {
      const defaultHotelFields = [
        'id',
        'location',
        'name',
        'description',
        'contacts',
        'address',
        'currency',
        'images',
        'amenities',
        'updatedAt',
      ];
      await request(server)
        .get(`/hotels/${address}`)
        .set('content-type', 'application/json')
        .set('accept', 'application/json')
        .expect((res) => {
          expect(res.body).to.have.all.keys(defaultHotelFields);
        })
        .expect(200);
    });

    it('should return all fields that a client asks for', async () => {
      const fields = ['name', 'location'];
      const query = `fields=${fields.join()}`;

      await request(server)
        .get(`/hotels/${address}?${query}`)
        .set('content-type', 'application/json')
        .set('accept', 'application/json')
        .expect((res) => {
          expect(res.body).to.have.all.keys([...fields, 'id']);
        })
        .expect(200);
    });

    it('should return all fields that a client asks for', async () => {
      const fields = ['managerAddress'];
      const query = `fields=${fields.join()}`;

      await request(server)
        .get(`/hotels/${address}?${query}`)
        .set('content-type', 'application/json')
        .set('accept', 'application/json')
        .expect((res) => {
          expect(res.body).to.have.all.keys([...fields, 'id']);
        })
        .expect(200);
    });

    it('should not return any non-existent fields even if a client asks for them', async () => {
      const fields = ['managerAddress', 'name'];
      const invalidFields = ['invalid', 'invalidField'];
      const query = `fields=${fields.join()},${invalidFields.join()}`;

      await request(server)
        .get(`/hotels/${address}?${query}`)
        .set('content-type', 'application/json')
        .set('accept', 'application/json')
        .expect((res) => {
          expect(res.body).to.have.all.keys([...fields, 'id']);
          expect(res.body).to.not.have.all.keys(invalidFields);
        })
        .expect(200);
    });

    it('should return a 404 for a non-existent address', async () => {
      await request(server)
        .get('/hotels/0x7135422D4633901AE0D2469886da96A8a72CB264')
        .set('content-type', 'application/json')
        .set('accept', 'application/json')
        .expect(404);
    });

    it('should not work for an address in a badly checksummed format', async () => {
      await request(server)
        .get(`/hotels/${address.toUpperCase()}`)
        .set('content-type', 'application/json')
        .set('accept', 'application/json')
        .expect((res) => {
          expect(res.body).to.have.property('code', '#hotelChecksum');
        })
        .expect(422);
    });
  });
});
