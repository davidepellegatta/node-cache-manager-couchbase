const cacheManager = require('cache-manager');
const couchbaseStore = require('../index');
const couchbase = require('couchbase');

let couchbaseCache;
let customCouchbaseCache;

var config = {
  connectionString: 'couchbase://127.0.0.1:8091',
  connectionOptions: {
    username: 'Administrator',
    password: 'password'
  },
  bucket: 'store_local',
  scope: '_default',
  collection: '_default',
  ttl: 2,
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

  customCouchbaseCache = cacheManager.caching({
    store: couchbaseStore,
    connectionString: config.connectionString,
    connectionOptions: config.connectionOptions,
    bucket: config.bucket,
    scope: config.scope,
    collection: config.collection,
    ttl: config.ttl,
    isCacheableValue: (val) => {
      if (val === undefined) { // allow undefined
        return true;
      } else if (val === 'FooBarString') { // disallow FooBarString
        return false;
      }
      return couchbaseCache.store.isCacheableValue(val);
    } 
  });

  //couchbaseCache.reset();
});

describe('set', () => {
  it('should return a promise',  async()  => { 
    const response = couchbaseCache.set('foo', 'bar');
    console.log("res test is "+response);
    await expect(response instanceof Promise).done();
  });

  it('should resolve promise on success', (done) => {
    couchbaseCache.set('foo', 'bar')
      .then(result => {
        expect(result.hasOwnProperty('cas')).toBeTruthy()
        done();
      });
  });

  it('should reject promise on error', (done) => {
    couchbaseCache.set('foo', null)
      .then(() => done(new Error('Should reject')))
      .catch(() => done());
  });
/*
  it('should store a value without ttl', (done) => {
    couchbaseCache.set('foo', 'bar', (err) => {
      expect(err).toEqual(null);
      done();
    });
  });

  it('should store a value with a specific ttl', (done) => {
    couchbaseCache.set('foo', 'bar', config.ttl, (err) => {
      expect(err).toEqual(null);
      done();
    });
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

  it('should store an undefined value if permitted by isCacheableValue', (done) => {
    expect(customCouchbaseCache.store.isCacheableValue(undefined)).toBe(true);
    customCouchbaseCache.set('foo3', undefined, (err) => {
      try {
        expect(err).toEqual(null);
        customCouchbaseCache.get('foo3', (err, data) => {
          try {
            expect(err).toEqual(null);
            expect(data).toEqual('undefined');
            done();
          } catch (e) {
            done(e);
          }
        });
      } catch (e) {
        done(e);
      }
    });
  });

  it('should not store a value disallowed by isCacheableValue', (done) => {
    expect(couchbaseCache.store.isCacheableValue('FooBarString')).toBe(false);
    customCouchbaseCache.set('foobar', 'FooBarString', (err) => {
      try {
        expect(err).not.toEqual(null);
        expect(err.message).toEqual('"FooBarString" is not a cacheable value');
        done();
      } catch (e) {
        done(e);
      }
    });
  });*/
});

/*describe('get', () => {
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

  it('should reject promise on error', (done) => {
    couchbaseCache.store.getClient().end(true);
    couchbaseCache.store.getClient().end(true);
    couchbaseCache.get('foo')
      .then(() => done(new Error('Should reject')))
      .catch(() => done())
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

  it('should retrieve a value for a given key if options provided', (done) => {
    const value = 'bar';
    couchbaseCache.set('foo', value, () => {
      couchbaseCache.get('foo', {}, (err, result) => {
        expect(err).toEqual(null);
        expect(result).toEqual(value);
        done();
      });
    });
  });

  it('should return null when the key is invalid', (done) => {
    couchbaseCache.get('invalidKey', (err, result) => {
      expect(err).toEqual(null);
      expect(result).toEqual(null);
      done();
    });
  });

  it('should return an error if there is an error acquiring a connection', (done) => {
    redisCache.store.getClient().end(true);
    redisCache.get('foo', (err) => {
      expect(err).not.toEqual(null);
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

  it('should return an error if there is an error acquiring a connection', (done) => {
    redisCache.store.getClient().end(true);
    redisCache.del('foo', (err) => {
      expect(err).not.toEqual(null);
      done();
    });
  });
});

describe('reset', () => {
  it('should flush underlying db', (done) => {
    couchbaseCache.reset((err) => {
      expect(err).toEqual(null);
      done();
    });
  });

  it('should flush underlying db without callback', (done) => {
    redisCache.reset();
    done();
  });

  it('should return an error if there is an error acquiring a connection', (done) => {
    couchbaseCache.store.getClient().end(true);
    couchbaseCache.reset((err) => {
      expect(err).not.toEqual(null);
      done();
    });
  });
});

describe('ttl', () => {
  it('should retrieve ttl for a given key', (done) => {
    couchbaseCache.set('foo', 'bar', () => {
      couchbaseCache.ttl('foo', (err, ttl) => {
        expect(err).toEqual(null);
        expect(ttl).toEqual(config.ttl);
        done();
      });
    });
  });

  it('should retrieve ttl for an invalid key', (done) => {
    redisCache.ttl('invalidKey', (err, ttl) => {
      expect(err).toEqual(null);
      expect(ttl).not.toEqual(null);
      done();
    });
  });

  it('should return an error if there is an error acquiring a connection', (done) => {
    couchbaseCache.store.getClient().end(true);
    couchbaseCache.ttl('foo', (err) => {
      expect(err).not.toEqual(null);
      done();
    });
  });
});

describe('keys', () => {
  it('should return a promise', (done) => {
    expect(redisCache.keys('foo')).toBeInstanceOf(Promise);
    done();
  });

  it('should resolve promise on success', (done) => {
    couchbaseCache.set('foo', 'bar')
      .then(() => redisCache.keys('f*'))
      .then(result => {
        expect(result).toEqual(['foo']);
        done();
      });
  });

  it('should reject promise on error', (done) => {
    couchbaseCache.store.getClient().end(true);
    couchbaseCache.keys('foo')
      .then(() => done(new Error('Should reject')))
      .catch(() => done())
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

  it('should return an error if there is an error acquiring a connection', (done) => {
    couchbaseCache.store.getClient().end(true);
    couchbaseCache.keys('foo', (err) => {
      expect(err).not.toEqual(null);
      done();
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

describe('redis error event', () => {
  it('should return an error when the redis server is unavailable', (done) => {
    couchbaseCache.store.getClient().on('error', (err) => {
      expect(err).not.toEqual(null);
      done();
    });
    couchbaseCache.store.getClient().emit('error', 'Something unexpected');
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


*/
