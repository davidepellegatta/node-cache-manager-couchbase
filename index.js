'use strict';

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

class CouchbaseStore {

    constructor(args) {
        var self = this;

        self.connectionString = args.connectionString;
        self.connectionOptions = args.connectionOptions;
        self.bucket = args.bucket;
        self.scope = args.scope;
        self.collection = args.collection;
        self.ttl = args.ttl;
        self.clients = {
            couchbaseBucket: null,
            couchbaseCluster: null,
            couchbaseCollection: null
        };

        self.name = 'couchbase';
        self.isCacheableValue = args.isCacheableValue || (value => value !== undefined && value !== null);
    }
    

    prepCouchbaseConnection() {
        var self = this;

        return Promise.try(() => {
            return couchbase.connect(self.connectionString, self.connectionOptions);
        }).then((cluster) => {
            self.clients.couchbaseCluster = cluster;
            return cluster.bucket(self.bucket);
        }).then((bucket) => {
            self.clients.couchbaseBucket = bucket; 
            return self.prepCollectionAccess();
        }).catch((err) => {
            console.log(err);
            throw err;
        });
    }



    //next step, add here index creation
    prepCollectionAccess() {
        var self = this;
        let collection;
        
        return Promise.try(() => {
            //defining scope and collection, otherwise falling back on default one.

            if (self.scope != null && self.scope !== 'undefined') {
                if (self.collection != null && self.collection !== 'undefined') {
                    collection = self.clients.couchbaseBucket
                        .scope(self.scope)
                        .collection(self.collection);
                }
            } else {
                collection = self.clients.couchbaseBucket.defaultCollection();
            }
            
            self.clients.couchbaseCollection = collection;
            return collection;
                
        }).catch((err) => {
            console.log(err);
            throw err;
        });
    }

    getCouchbaseCollection() {
        var self = this;
        return Promise.try(() => {
            if (self.clients.couchbaseBucket && self.clients.couchbaseCollection) {
                console.log('using already open conn');
                return self.clients.couchbaseCollection;
            } else {
                console.log('creating a new conn');
                return this.prepCouchbaseConnection();
            }
        }).catch((err) => {
            console.log(err);
            throw err;
        });
    }

    set(key, value, options, cb) {
        var couchbaseStore = this;

        if (typeof options === 'function') {
            cb = options;
            options = {
                ttl: 0
            };
        }

        if (options == null || options === 'undefined') {
            options = {};
        }

        if (cb === undefined) {
            return new Promise(function (resolve, reject) {
                couchbaseStore.set(key, value, options, function (err, result) {
                    err ? reject(err) : resolve(result)
                })
            })
        }

        if (!couchbaseStore.isCacheableValue(value)) {
            return cb(new Error(`"${value}" is not a cacheable value`));
        }

        let ttl = (options.ttl || options.ttl === 0) ? options.ttl : couchbaseStore.ttl;
        ttl = ttl * 60;

        couchbaseStore.getCouchbaseCollection()
            .then((collection) => {
                return collection.upsert(key, value, { expiry: ttl });
            }).then((result) => cb(null, result))
            .catch((err) => {
                console.log(err);
                cb(err);
            })
    }

    get(key, options, cb) {
        var couchbaseStore = this;

        if (typeof options === 'function') {
            cb = options;
            options = {};
        }

        if (cb === undefined) {
            return new Promise(function (resolve, reject) {
                couchbaseStore.get(key, options, function (err, result) {
                    err ? reject(err) : resolve(result)
                })
            })
        }

        couchbaseStore.getCouchbaseCollection()
            .then((collection) => {
                return collection.get(key);
            }).then((value) => cb(null, value.result))
            .catch((err) => {
                cb(err);
            });
    }

    del(key, options, cb) {
        var couchbaseStore = this;

        if (typeof options === 'function') {
            cb = options;
            options = {};
        }

        if (cb === undefined) {
            return new Promise(function (resolve, reject) {
                couchbaseStore.del(key, options, function (err, result) {
                    err ? reject(err) : resolve(result)
                })
            })
        }

        couchbaseStore.getCouchbaseCollection()
            .then((collection) => {
                return collection.remove(key);
            }).then((value) => cb(null, value))
            .catch((err) => {
                cb(err);
            });
    }

    reset(cb) {
        var couchbaseStore = this;

        if (cb === undefined) {
            return new Promise(function (resolve, reject) {
                couchbaseStore.reset(function (err, result) {
                    err ? reject(err) : resolve(result)
                })
            })
        }

        couchbaseStore.getCouchbaseCollection()
            .then(()=> couchbaseStore.cluster.buckets)
            .then((bucketMgr) => bucketMgr.flushBucket(couchbaseStore.bucket))
            .then((value) => cb(null, value))
            .catch((err) => cb(err));
    }

    keys(pattern, cb) {
        var couchbaseStore = this;

        if (cb === undefined) {
            return new Promise(function (resolve, reject) {
                couchbaseStore.keys(key, options, function (err, result) {
                    err ? reject(err) : resolve(result)
                })
            })
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
            }
        };

        couchbaseStore.cluster.query(query, optionsQuery)
            .then((results) => {
                return results.rows;
            })
            .then((rows) => cb(null, rows))
            .catch((err) => cb(err));
    }

    ttl(key, cb) {
        var couchbaseStore = this;

        if (cb === undefined) {
            return new Promise(function (resolve, reject) {
                couchbaseStore.ttl(key, function (err, result) {
                    err ? reject(err) : resolve(result)
                })
            })
        }

        couchbaseStore.getCouchbaseCollection()
            .then((collection) => {
                return collection.get(key);
            })
            .then((result) => {
                return (result.expiryTime - Math.floor(Date.now() / 1000));
            })
            .then((exp) => cb(null, exp))
            .catch((err) => cb(err));
    }
}

exports = module.exports = {
    create: (args) => {
        return new CouchbaseStore(args);
    }
};