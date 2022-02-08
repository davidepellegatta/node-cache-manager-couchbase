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
    connectionString: config.connectionString,
    store: couchbaseStore,
    connectionOptions: config.connectionOptions,
    bucket: config.bucket,
    scope: config.scope,
    collection: config.collection,
    ttl: config.ttl
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

  it('should not store an invalid value', (done) => {
    couchbaseCache.set('foo1', undefined, (err) => {
      try {
        expect(err).not.toEqual(null);
        expect(err.message).toEqual('"undefined" is not a cacheable value');
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it('should reject promise on error', (done) => {
    couchbaseCache.set('foo', null)
      .then(() => done(new Error('Should reject')))
      .catch(() => done());
  });

  it('should not be able to store a null value (not cacheable)', (done) => {
    couchbaseCache.set('foo2', null, (err) => {
      if (err) {
        return done();
      }
      done(new Error('Null is not a valid value!'));
    });
  });

  it('should store a value without callback', (done) => {
    couchbaseCache.set('foo', 'baz');
    couchbaseCache.get('foo', (err, value) => {
      expect(err).toEqual(null);
      expect(value).toEqual('baz');
      done();
    });
  });

});

describe('get', () => {
  it('should return a promise', (done) => {
    expect(couchbaseCache.get('foo')).toBeInstanceOf(Promise);
    done();
  });

  it('should resolve promise on success', (done) => {
    couchbaseCache.set('foo', 'bar')
      .then(() => couchbaseCache.get('foo'))
      .then(result => {
        expect(result).toEqual('bar');
        done();
      });
  });

  it('should reject promise on error', async () => {
    const client = couchbaseCache.store.getClient();
    client.get = (key, cb) => cb(new Error('Something went wrong'));
    
    await couchbaseCache.get('foo')
      .catch((err) => {
        expect(err.message).toEqual('Something went wrong');
      })
  });

  it('should retrieve a value for a given key', (done) => {
    const value = 'bar';
    couchbaseCache.set('foo', value, () => {
      couchbaseCache.get('foo', (err, result) => {
        expect(err).toEqual(null);
        expect(result).toEqual(value);
        done();
      });
    });
  });

  it('should retrieve a value for a given key if options provided', async () => {
    const value = 'bar';
    const firstOp = await couchbaseCache.set('foo', value);
    const secondOp = await couchbaseCache.get('foo', {});
    expect(secondOp).toEqual(value);
  });

  it('should return null when the key is invalid', (done) => {
    couchbaseCache.get('invalidKey', (err, result) => {
      expect(err).toEqual(null);
      expect(result).toEqual(null);
      done();
    });
  });
});
