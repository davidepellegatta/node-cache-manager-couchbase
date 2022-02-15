
Couchbase store for node cache manager
==================================

Couchbase cache store for [node-cache-manager](https://github.com/BryanDonovan/node-cache-manager). 

Installation
------------

```sh
npm install cache-manager-couchbase --save
```
or
```sh
yarn add cache-manager-couchbase
```

Usage Examples
--------------
See examples below on how to implement the Redis cache store.

### Single store

```js
var cacheManager = require('cache-manager');
var couchbaseStore = require('cache-manager-couchbase-store');

var config = {
  connectionString: 'couchbase://127.0.0.1:8091',
  connectionOptions: {
    username: 'Administrator',
    password: 'Administrator'
  },
  bucket: 'your-bucket',
  scope: 'aScope',
  collection: 'aCollection',
  ttl: 2
};

var couchbaseCache = cacheManager.caching({
    connectionString: config.connectionString,
    store: couchbaseStore,
    connectionOptions: config.connectionOptions,
    scope: config.scope,
    bucket: config.bucket,
    collection: config.collection,
    ttl: 60
  });


couchbaseStore.set('foo', 'bar', { ttl: ttl }, (err) => {
  if (err) {
    throw err;
  }

  couchbaseStore.get('foo', (err, result) => {
    console.log(result);
    // >> 'bar'
    redisCache.del('foo', (err) => {
    });
  });
});

function getUser(id, cb) {
  setTimeout(() => {
    console.log("Returning user from slow database.");
    cb(null, { id: id, name: 'Bob' });
  }, 100);
}

var userId = 123;
var key = `user_${userId}`;

couchbaseStore.wrap(key, (cb) => {
  getUser(userId, cb);
}, { ttl: ttl }, (err, user) => {
  console.log(user);

  couchbaseStore
    .wrap(key, () => getUser(userId))
    .then(console.log)
    .catch(err => {
      // handle error
    });
});
```

Next Implementations
--------------

* Improve connection error handling
* Improve documentation
* Improve keys method
* Verify ttl method compliancy
* Upgrade Couchbase Cluster connection to a non-blocking mode (To Be Checked)