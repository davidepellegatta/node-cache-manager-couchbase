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

describe('get', () => {
  it('should return a MutationResult object when succesful', async () => {

    const res = await couchbaseCache.set('foo', 'bar');
    
    expect(res).not.toBeUndefined();
  })
})

