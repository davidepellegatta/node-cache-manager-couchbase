
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
var couchbaseStore = require('cache-manager-couchbase');

var config = {
  connectionString: 'couchbase://127.0.0.1:8091',
  connectionOptions: {
    username: 'Administrator',
    password: 'couchbase'
  },
  bucket: 'test-bucket',
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

var ttl = 2;

couchbaseCache.set('foo', 'bar', { ttl: ttl }, (err) => {
  if (err) {
    throw err;
  }

  couchbaseCache.get('foo', (err, result) => {
    console.log(result);
    // >> 'bar'
    couchbaseCache.del('foo', (err) => {
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

// Note: ttl is optional in wrap()
couchbaseCache.wrap(key, (cb) => {
  getUser(userId, cb);
}, { ttl: ttl }, (err, user) => {
  console.log(user);

  // Second time fetches user from redisCache
  couchbaseCache
    .wrap(key, () => getUser(userId))
    .then(console.log)
    .catch(err => {
      // handle error
    });
});
```

Couchbase Buckets
--------------

Couchbase use buckets, scopes and collection to segment customer. The `cache-manager-couchbase` configuration let you choose between all of them.

Example for couchbase pre-7.x (no scopes and collection):

```js
var config = {
  connectionString: 'couchbase://127.0.0.1:8091',
  connectionOptions: {
    username: 'Administrator',
    password: 'your-secret-p@ssw0rd'
  },
  bucket: 'your-bucket'
};
```

Example for couchbase  >7.x:

```js
var config = {
  connectionString: 'couchbase://127.0.0.1:8091',
  connectionOptions: {
    username: 'Administrator',
    password: 'your-secret-p@ssw0rd'
  },
  bucket: 'your-bucket',
  scope: 'your-scope',
  collection: 'your-collection',
  ttl: 2
};
```

Couchbase Connection
--------------

The configuration let you customise how the plugin connects to your couchbase cluster. 

```js
var config = {
  connectionString: 'couchbase://127.0.0.1:8091',
  connectionOptions: {
    username: 'Administrator',
    password: 'couchbase'
  },
  bucket: 'your-bucket'
};
```

`connectionString` let you provide one or multiple seed nodes and `connectionOptions` are passed right away to the underlying couchbase nodejs SDK so that you can use all options provided here on the [couchbase documentation](https://docs.couchbase.com/nodejs-sdk/current/howtos/managing-connections.html)

Example for couchbase > 7.x 

```js
var config = {
  connectionString: 'couchbase://127.0.0.1:8091',
  connectionOptions: {
    username: 'Administrator',
    password: 'couchbase'
  },
  bucket: 'test-bucket',
  ttl: 2
};
```

Important! Setting up your bucket for `cache-manager` keys method
--------------

Once your couchbase bucket is set up you will need to create an index so that the `keys` method can effectively look up for your keys.

Here an example:

```sql
CREATE INDEX `all_keys` ON `your-bucket`((meta().`id`))
```


If you see an error like the following:

```
error properties: Object({ cause: Error: libcouchbase error 401, context: QueryErrorContext({ first_error_code: 4000, first_error_message: 'No index available on keyspace test-bucket that matches your query. Use CREATE INDEX or CREATE PRIMARY INDEX to create an index, or check that your expected index is online.', statement: 'SELECT RAW meta(b).id FROM  `test-bucket` b  WHERE REGEXP_CONTAINS(META(b).id, $PATTERN)', client_context_id: 'c1ed4896bea27e6c', parameters: '', http_response_code: 404, http_response_body: '' }) })
```
It means the above mentioned index is missing!


Keys method
--------------

The 'keys' method let you selectively extract keys. This selection on couchbase is implemented through a SQL query using the `REGEXP_CONTAINS` so tha you can use a regexp to select your keys.

Example:

```js
couchbaseCache.keys('f*')
```

Next Implementations
--------------

* auto provision `keys` index
* Improve connection error handling
* Improve keys method performances
* Verify ttl method compliancy
* Upgrade Couchbase Cluster connection to a non-blocking mode (To Be Checked)