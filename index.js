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

    //maybe some validation? let's see after the tests

    console.log(`Starting CouchbaseStore for node-cache-manager with ${args}`)

    let cluster = new couchbase.Cluster(args[0].connectionString, args[0].connectionOptions);
    let couchbaseBucket = cluster.bucket(args[0].bucket);
    let couchbaseCollection = null;
    let couchbaseBucketManager = null;
    let globalTtl = 0;
    let isCacheableValue = (value) => (value => value !== undefined && value !== null);

    if (args[0].scope != null && args[0].scope !== 'undefined') {
        if (args[0].collection != null && args[0].collection !== 'undefined') {
            couchbaseCollection = couchbaseBucket.scope(args[0].scope).collection(args[0].collection);
        }
    } else {
        couchbaseCollection = couchbaseBucket.defaultCollection();
    }

    couchbaseBucketManager = cluster.buckets();


    if (args[0].isCacheableValue != null && args[0].isCacheableValue !== 'undefined') {
        isCacheableValue = (value => value !== undefined && value !== null);
    }

    let self = {
        name: 'couchbase'
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
        
        couchbaseCollection
            .get(key)
            .then((result) => {
                return cb(null, result.content);
            })
            .catch((err) => {
                return cb(err);
            });
    };

    self.del = (key, options, cb) => {

    };

    self.reset = () => {

    };

    self.keys = (pattern, cb) => { };

    self.ttl = (key, cb) => { };

    return self;
};

const methods = {
    create: (...args) => couchbaseStore(...args),
};

module.exports = methods;