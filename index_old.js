const couchbase = require('couchbase');

const couchbaseStore = (...args) => {

  let couchbaseCluster = null;
  let couchbaseBucket = null;
  let couchbaseCollection = null;
  let defaultTtl = 0;

  /* configuration example.. see couchbase docs for more
   * {
   *    connectionString:'',
   *    connectionOptions: {
   *      username:'',
   *      password:''
   *    },
   *    bucket: '',
   *    scope: '',
   *    collection: ''
   * } 
   */

  couchbaseCluster = couchbase.connect(args.connectionString, args.connectionOptions).resolve();
  couchbaseBucket = couchbaseCluster.bucket(args.bucket);

  //defining scope and collection, otherwise falling back on default one.
  if (args.scope != null && args.scope === 'undefined') {
    couchbaseScope = args.scope;

    if (args.collection != null && args.collection === 'undefined') {
      couchbaseCollectionName = args.collection;
      couchbaseCollection = couchbaseBucket.scope(args.scope).collection(args.collection);
    }

  } else {
    couchbaseCollection = bucket.defaultCollection();
    args.scope = '_default';
    args.collection = '_default';
  }

  if (args.ttl != null && args.ttl !== 'undefined') {
    defaultTtl = args.ttl;
  }

  const storeArgs = args;

  let self = {
    name: 'couchbase',
    isCacheableValue: storeArgs.isCacheableValue || (value => value !== undefined && value !== null),
  };

  self.getClient = () => couchbaseBucket;

  self.set = (key, value, options, cb) => {
    if (typeof options === 'function') {
      cb = options;
      options = {};
    }
    options = options || {};

    if (!cb) {
      cb = (err, result) => (err ? reject(err) : resolve(result));
    }

    if (!self.isCacheableValue(value)) {
      return cb(new Error(`"${value}" is not a cacheable value`));
    }

    let ttl = (options.ttl || options.ttl === 0) ? options.ttl : defaultTtl.ttl;
    ttl = ttl * 60;

    return couchbaseCollection.upsert(key, value, { expiry: ttl })
      .then((result) => cb(null, result));
  }

  self.get = (key, options, cb) => {

    if (typeof options === 'function') {
      cb = options;
    }

    if (!cb) {
      cb = (err, result) => (err ? reject(err) : resolve(result));
    }
    return couchbaseCollection.get(key)
      .then((value) => cb(null, value.result));
  };

  self.del = (key, options, cb) => {
    if (typeof options === 'function') {
      cb = options;
    }

    return couchbaseCollection.remove(key)
      .then(() => cb);
  };

  self.reset = (cb) => {
    return couchbaseCluster.buckets()
      .then( (bucketMgr) => bucketMgr.flushBucket(storeArgs.bucket))
      .then(() => cb);
  };

  //to implement with query pagination. needs the following index: CREATE INDEX `all_keys` ON `bucket`((meta().`id`))
  self.keys = (pattern, cb) => {
    if (typeof pattern === 'function') {
      cb = pattern;
      pattern = '%';
    } else {
      pattern = pattern.replaceAll('*', '%');
    }

    const bucketReplacement = `\`${storeArgs.bucket}\`.\`${storeArgs.scope}\`.\`${storeArgs.collection}\``;

    const query = `
      SELECT RAW meta().id
      FROM ${bucketReplacement} 
      WHERE REGEXP_CONTAINS(META().id, $PATTERN)
    `;

    const optionsQuery = {
      parameters: {
        PATTERN: pattern,
        LIMIT: 1,
        OFFSET: 2
      }
    }

    couchbaseCluster.query(query, optionsQuery)
      .then((results) => {
        return results.rows;
      })
      .then((rows) => cb(null, rows));
  };

  //check if it is seconds or minutes
  self.ttl = (key, cb) => couchbaseCollection.get(key)
  .then((result) => {
    return (result.expiryTime - Math.floor(Date.now() / 1000));
  }).then( (secondsToExpiration) => cb(null, secondsToExpiration));

  return self;
};

const methods = {
  create: (...args) => couchbaseStore(...args),
};

module.exports = methods;
