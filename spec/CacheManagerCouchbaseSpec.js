const cacheManager = require('cache-manager');
const couchbaseStore = require('../index');
const couchbase = require('couchbase');

let couchbaseCache;
let customCouchbaseCache;

var config = {
  connectionString: 'couchbase://127.0.0.1:8091',
  connectionOptions: {
    username: 'Administrator',
    password: 'Administrator'
  },
  bucket: 'test-bucket',
  scope: '_default',
  collection: '_default',
  ttl: 2
};

beforeAll(async () => {
  couchbaseCache = cacheManager.caching({
    connectionString: config.connectionString,
    store: couchbaseStore,
    connectionOptions: config.connectionOptions,
    scope: config.scope,
    bucket: config.bucket,
    collection: config.collection,
    ttl: config.ttl
  });
  
  await couchbaseCache.reset();
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

describe('del', () => {
  it('should delete a value for a given key', (done) => {
    couchbaseCache.set('foo', 'bar', () => {
      couchbaseCache.del('foo', (err) => {
        expect(err).toEqual(null);
        done();
      });
    });
  });

  it('should delete a value for a given key without callback', (done) => {
    couchbaseCache.set('foo', 'bar', () => {
      couchbaseCache.del('foo');
      done();
    });
  });
});

describe('reset', () => {

  jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

  it('should flush underlying db', (done) => {
    couchbaseCache.reset((err) => {
      expect(err).toEqual(null);
      done();
    });
  });

  it('should flush underlying db without callback', (done) => {
    couchbaseCache.reset();
    done();
  });
});

describe('ttl', () => {
  it('should retrieve ttl for a given key', async () => {

    await couchbaseCache.set('foo', 'bar');
    await couchbaseCache.ttl('foo', (err, ttl) => {
      expect(err).toEqual(null);
      expect(ttl).not.toEqual(null);
    });
  });


  it('should retrieve ttl for an invalid key', async () => {
    await couchbaseCache.ttl('invalidKey', (err, ttl) => {
      expect(err).toEqual(null);
      expect(ttl).not.toEqual(null);
    });
  });
});

describe('keys', () => {
  it('should return a promise', (done) => {
    expect(couchbaseCache.keys('foo')).toBeInstanceOf(Promise);
    done();
  });

  it('should resolve promise on success', (done) => {
    couchbaseCache.set('foo', 'bar')
      .then(() => couchbaseCache.keys('f*'))
      .then(result => {
        expect(result.indexOf('foo')).not.toEqual(-1);
        done();
      });
  });

  it('should return an array of keys for the given pattern', (done) => {
    couchbaseCache.set('foo', 'bar', () => {
      couchbaseCache.keys('f*', (err, arrayOfKeys) => {
        expect(err).toEqual(null);
        expect(arrayOfKeys).not.toEqual(null);
        expect(arrayOfKeys.indexOf('foo')).not.toEqual(-1);
        done();
      });
    });
  });

  it('should return an array of keys without pattern', (done) => {
    couchbaseCache.set('foo', 'bar', () => {
      couchbaseCache.keys((err, arrayOfKeys) => {
        expect(err).toEqual(null);
        expect(arrayOfKeys).not.toEqual(null);
        expect(arrayOfKeys.indexOf('foo')).not.toEqual(-1);
        done();
      });
    });
  });

});

describe('isCacheableValue', () => {
  it('should return true when the value is not undefined', () => {
    expect(couchbaseCache.store.isCacheableValue(0)).toBe(true);
    expect(couchbaseCache.store.isCacheableValue(100)).toBe(true);
    expect(couchbaseCache.store.isCacheableValue('')).toBe(true);
    expect(couchbaseCache.store.isCacheableValue('test')).toBe(true);
  });

  it('should return false when the value is undefined', () => {
    expect(couchbaseCache.store.isCacheableValue(undefined)).toBe(false);
  });

  it('should return false when the value is null', () => {
    expect(couchbaseCache.store.isCacheableValue(null)).toBe(false);
  });
});

describe('wrap function', () => {
  // Simulate retrieving a user from a database
  function getUser(id, cb) {
    setTimeout(() => {
      cb(null, { id: id });
    }, 100);
  }

  // Simulate retrieving a user from a database with Promise
  function getUserPromise(id) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ id: id });
      }, 100);
    });
  }

  it('should be able to cache objects', (done) => {
    const userId = 123;

    // First call to wrap should run the code
    couchbaseCache.wrap('wrap-user', (cb) => {
      getUser(userId, cb);
    }, (err, user) => {
      expect(user.id).toEqual(userId);

      // Second call to wrap should retrieve from cache
      couchbaseCache.wrap('wrap-user', (cb) => {
        getUser(userId + 1, cb);
      }, (err, user) => {
        expect(user.id).toEqual(userId);
        done();
      });
    });
  });

  it('should work with promises', () => {
    const userId = 123;

    // First call to wrap should run the code
    return couchbaseCache
      .wrap(
        'wrap-promise',
        () => getUserPromise(userId),
      )
      .then((user) => {
        expect(user.id).toEqual(userId);

        // Second call to wrap should retrieve from cache
        return couchbaseCache.wrap(
          'wrap-promise',
          () => getUserPromise(userId + 1),
        )
          .then((user) => expect(user.id).toEqual(userId));
      });
  });
});
