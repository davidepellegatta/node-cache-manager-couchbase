const couchbase = require('couchbase');
Promise = require('bluebird');


/* configuration example.. see couchbase docs for more
   * {
   *    connectionString:'',
   *    connectionOptions: {
   *      username:'',
   *      password:''
   *    },
   *    bucket: '',
   *    scope: '',
   *    collection: '',
   *    ttl: 10
   * } 
   */
const couchbaseStore = (...args) => {

    const globalOptions = args[0];
    let cluster = new couchbase.Cluster(globalOptions.connectionString, globalOptions.connectionOptions);
    let couchbaseBucket = cluster.bucket(globalOptions.bucket);
    let couchbaseCollection = null;
    let couchbaseBucketManager = null;
    let globalTtl = 0;
    let isCacheableValue = (value) => ((value !== null && value !== undefined) ? true : false);
    
    if (globalOptions.scope != null && globalOptions.scope !== 'undefined') {
        if (globalOptions.collection != null && globalOptions.collection !== 'undefined') {
            couchbaseCollection = couchbaseBucket.scope(globalOptions.scope).collection(globalOptions.collection);
        }
    } else {
        couchbaseCollection = couchbaseBucket.defaultCollection();
    }

    couchbaseBucketManager = cluster.buckets();

    let self = {
        name: 'couchbase',
        options: globalOptions,
        isCacheableValue
    };

    self.getClient = () => {
        return cluster;
    }

    self.set = (key, value, options, cb) => {

        if (typeof options === 'function') {
            cb = options;
            options = {
                ttl: 0
            };
        }

        if (options == null || options === 'undefined') {
            options = {
                ttl: 0
            };
        }

        if (cb === undefined) {
            return new Promise(function (resolve, reject) {
                self.set(key, value, options, function (err, result) {
                    err ? reject(err) : resolve(result)
                })
            })
        }

        if (!isCacheableValue(value)) {
            return cb(new Error(`"${value}" is not a cacheable value`));
        }

        let ttl = (options.ttl || options.ttl === 0) ? options.ttl : globalTtl;
        ttl = ttl * 60;

        couchbaseCollection.upsert(key, value, { expiry: ttl }, cb);
    };

    self.get = (key, options, cb) => {
        if (typeof options === 'function') {
            cb = options;
        }

        if (cb === undefined) {
            return new Promise(function (resolve, reject) {
                self.get(key, options, function (err, result) {
                    err ? reject(err) : resolve(result)
                })
            })
        }

        couchbaseCollection.get(key)
            .then((result) => {
                return cb(null, result.content);
            })
            .catch((err) => {
                if(err.message == 'document not found') {
                    return cb(null, null);
                }
                return cb(err);
            });
    };

    self.del = (key, options, cb) => {
        if (typeof options === 'function') {
            cb = options;
        }

        if (cb === undefined) {
            return new Promise(function (resolve, reject) {
                self.del(key, options, function (err, result) {
                    err ? reject(err) : resolve(result)
                })
            })
        }

        couchbaseCollection.remove(key, cb);
    };

    self.reset = (cb) => {

        if (cb === undefined) {
            return new Promise(function (resolve, reject) {
                self.reset(function (err, result) {
                    err ? reject(err) : resolve(result)
                })
            })
        }

        return couchbaseBucketManager.flushBucket(globalOptions.bucket, cb);
    };

    self.keys = (pattern, cb) => {

        if (typeof pattern === 'function') {
            cb = pattern;
            pattern = '';
        }

        if (cb === undefined) {
            return new Promise(function (resolve, reject) {
                self.keys(pattern, function (err, result) {
                    err ? reject(err) : resolve(result)
                })
            })
        }

        let bucketReplacement = null;

        if (globalOptions.collection == null && globalOptions.collection === 'undefined') {
            bucketReplacement = ` \`${globalOptions.bucket}\` b `;
        } else {
            bucketReplacement = ` \`${globalOptions.bucket}\`.\`${globalOptions.scope}\`.\`${globalOptions.collection}\` b `;
        }

        const query = `
            SELECT RAW meta(b).id
            FROM ${bucketReplacement} 
            WHERE REGEXP_CONTAINS(META(b).id, $PATTERN)
          `;

        const optionsQuery = {
            parameters: {
                PATTERN: pattern
            }
        }

        cluster.query(query, optionsQuery)
            .then((result) => {
                return cb(null, result.rows);
            })
            .catch((err) => {
                return cb(err);
            });
    };

    self.ttl = (key, cb) => {

        if (cb === undefined) {
            return new Promise(function (resolve, reject) {
                self.ttl(key, function (err, result) {
                    err ? reject(err) : resolve(result)
                })
            })
        }

        couchbaseCollection.get(key)
            .then((result) => {
                return (result.expiryTime - Math.floor(Date.now() / 1000));
            })
            .then((secondsToExpiration) => {
                return cb(null, secondsToExpiration);
            })
            .catch((err) => {
                if(err.message == 'document not found') {
                    return cb(null, -1);
                }
                return cb(err);
            });
    };

    return self;
};

const methods = {
    create: (...args) => couchbaseStore(...args),
};

module.exports = methods;