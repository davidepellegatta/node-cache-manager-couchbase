const cacheManager = require('cache-manager');
const couchbaseStore = require('../index');
const couchbase = require('couchbase');

let couchbaseCache;
let customCouchbaseCache;

var config = {
  connectionString: 'couchbase://127.0.0.1:8091',
  connectionOptions: {
    username: 'Administrator',
    password: 'couchbase'
  },
  bucket: 'test-bucket',
  scope: '_default',
  collection: '_default',
  ttl: 2
};

beforeAll((done) => {
  couchbaseCache = cacheManager.caching({
    store: couchbaseStore,
    connectionString: config.connectionString,
    connectionOptions: config.connectionOptions,
    bucket: config.bucket,
    scope: config.scope,
    collection: config.collection,
    ttl: config.ttl,
  });

  done();
});

afterAll(async () => {
  await couchbaseCache.store.getClient().close();
});

describe('set', () => {
  it('should return a MutationResult object when succesful', async () => {
    const res = await couchbaseCache.set('foo', 'bar');
    expect(res).not.toBeUndefined();
  });

  it('should store a value without ttl', (done) => {
    couchbaseCache.set('foo', 'bar', (err) => {
      expect(err).toEqual(null);
      done();
    });
  });

  it('should store a value with a specific ttl', (done) => {
    couchbaseCache
      .set('foo', 'bar', { ttl: 60 }, (err) => {
        expect(err).toEqual(null);
        done();
      });
  });


});

describe('get', () => {
  it('should return a promise', (done) => {
    expect(couchbaseCache.get('foo')).toBeInstanceOf(Promise);
    done();
  });

  it('should resolve promise on success', async () => {

    const setRes = await couchbaseCache.set('foo', 'bar');
    const getRes = await couchbaseCache.get('foo');

    expect(getRes).toEqual('bar');
  });

  /*
  // this causes a segmentation fault
  it('should reject promise on error', async () => {

    try {
      let result = await couchbaseCache.get('foo', () => new Error('Something went wrong'));
    } catch (err) {
      expect(err.message).toEqual('Something went wrong');
    }
  });*/
});
