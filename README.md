# Scamandrios

A promises API for Cassandra, forked from [helenus](https://github.com/simplereach/helenus). Helenus was Cassandra's twin brother. He was also known as Scamandrios. Like Cassandra, his prophecies were correct, but unlike her he was believed. 

[![NPM](https://nodei.co/npm/scamandrios.png)](https://nodei.co/npm/scamandrios/)

[![Build Status](https://secure.travis-ci.org/lyveminds/scamandrios.png)](http://travis-ci.org/blackpearlsystems/scamandrios) [![Dependenciess](https://david-dm.org/lyveminds/scamandrios.png)](https://david-dm.org/blackpearlsystems/scamandrios)

To install:

`npm install scamandrios`

There is a set of integration tests run by mocha. The tests require cassandra to be running on `localhost:9160`. To run them:

`make test && make test-cov`

`make coverage` will generate a full code coverage report in `tests/coverage.html`.

## Usage

### CQL

Connection pools are interchangeable with connection objects. You can make all Cassandra API calls against pools or single connections the same way. To create a pool:

```javascript
var scamandrios = require('scamandrios');

var pool = new scamandrios.ConnectionPool(
{
        hosts      : ['localhost:9160'],
        keyspace   : 'scamandrios_test',
        user       : 'test',
        password   : 'test1233',
        timeout    : 3000
        cqlVersion : '3.0.0', // default
        getHost    : getHostFunc, // optional
});
```

Specify the `cqlVersion` parameter if you do not wish to use CQL 3.0.

You can supply a function in the `getHost` parameter to override the random host selection that the pool will perform when handling a request.

As with most error-emitting objects in node, if you do not listen for `error` it will bubble up to `process.uncaughtException`.

```javascript
pool.on('error', function(err)
{
    console.error(err.name, err.message);
});
```

All asynchronous operations return promises in lieu of taking callbacks. The promises library used is [P](https://github.com/rkatic/p), which is Promises/A+ spec compliant. Here's an example of making a CQL query:

```javascript
pool.connect()
.then(function()
{
    return pool.cql('SELECT col FROM cf_one WHERE key = ?', ['key123']);
})
.then(function(results)
{
    // results can be iterated to get rows
    results.forEach(function(row)
    {
        // rows can be iterated to get column contents
        row.forEach(function(name, value, timestamp, ttl)
        {
            console.log(name, value, timestamp, ttl);
        });
    });
})
.fail(function(err)
{
    console.log(err);
}).done();
```

The first argument to `cql()` is the query string. The second is an array of items to interpolate into the query string, which is accomplished using [util.format()](http://nodejs.org/docs/latest/api/util.html#util.format). The result is an array of Row objects. You can always skip quotes around placeholders. Quotes are added automatically. In CQL3 you cannot use placeholders for ColumnFamily or Column names.

### CQL3 queries

CQL can express a set of types more specific than javascript's types. To javascript, a Cassandra `set<text>` and a `list<text>` both look like arrays. We found it helpful to have a query-contruction API that accepted type hints, so sets and lists could be interpolated properly into query strings.

The `scamandrios.Query` constructor exists to help you do this. Here's a somewhat contrived example:

```javascript
var scamandrios = require('scamandrios');

var conn = new scamandrios.Connection();

var query = new scamandrios.Query('INSERT INTO {table} ({key_col}, {name_col}, {email_col}) VALUES ({key}, {name}, {emails})')
    .types(
    {
        key: 'uuid',
        name: 'text',
        emails: 'map<text, boolean>'
    })
    .params(
    {
        table: 'users',
        key_col: 'uid',
        email_col: 'emails',
        key: '271B6C60-A22D-4D0E-8171-0D344784217E',
        name: 'Mortimer Q. Snerd',
        emails:
        {
            'mortimer@example.com': true,
            'msnerd@hotmail.example.com': false
        }
    });

query.execute(conn);
```

#### new Query(str)

Takes a query string and returns a query object.

Think of the query string as being like a handlebars template object. Variables are mentioned inside curly braces: 

    `SELECT * FROM {table} WHERE {keycolumn} = {keyvalue}` 

There are three variables in that cql statement that need to be interpolated correctly: `table`, `keycolumn`, and `keyvalue`.

#### query.params(obj)

Builds a dictionary in the query object mapping named parameters to their values. Can be called repeatedly to add fields to the dictionary.

Returns the query object so the function can be chained.

#### query.types(obj)

Builds a dictionary in the query object mapping named parameters to their types. Can be called repeatedly to add fields to the dictionary. *Types not appearing in this mapping are presumed to be Cassandra identifiers.* That is, values that do not need to be quoted or escaped in any way.

Returns the query object so the function can be chained.

#### query.execute(connection)

Interpolate variables into the query string & execute the query. Takes a connection or connection pool parameter. Returns a promise that resolves to the result of the query.

### Conveniences

### scamandrios.discover(seed)

Given a seed node, return an array of peers in the Cassandra ring. The hosts will be dotted quad addresses and will not include any port information.

```javascript
scamandrios.discover('10.0.0.1:9160')
.then(function(hosts)
{
    console.log(hosts);
});
```

Discover can also take an options object:

```javascript
var opts = 
{
    host: 'loadbalancing.proxy.example.com',
    port: '9160',
    user: 'george',
    password: 'mischief managed',
    lookupSeed: true   // do a second query to discovery the IP of the seed node
};

scamandrios.discover(opts)
.then(function(hosts)
{
    console.log(hosts);
});
```

### scamandrios.discoverPool(seed, connectionOptions)

Given a seed node, return a ConnectionPool configured with the given options. This function assumes that your Cassandra hosts are all using the default port `9160`.

```javascript
scamandrios.discoverPool('10.0.0.1:9160', { user: 'fred', password: 'mischief managed', timeout: 5000 })
.then(function(pool)
{
    return pool.connect();
});
```

### DiscoveryPool

If you would like your pool to automatically rediscover its nodes on a timer, use a `DiscoveryPool`.

```javascript

var DiscoveryPool = require(scamandrios).DiscoveryPool;

var opts =
{
    user: 'george',
    password: 'mischief managed',
    lookupSeed: true
};
var pool = new DiscoveryPool('loadbalancing.proxy.example.com', opts);
pool.connect()
.then(function()
{
    // make queries etc
}).done();

```

The seed node will be queried to discover the current state of the ring periodically. As nodes enter & leave, clients will be created & destroyed. The interval isn't yet configurable. It's 30 seconds aka the same as the monitor interval.

### pool.health()

Returns an object with two fields:

```javascript
{
    healthy: [ 'happyHost1:port', 'happyHost2:port' ],
    unhealthy: [ 'unhappyHost1:port', 'unhappyHost2:port']
}
```

### pool.executeCQLAllClients(buffer)

Executes the given CQL query on all active clients. Very useful if you want to point your entire connection pool at a single keyspace, for instance, or if you're executing a health-check query on all of them.

#### connection.assignKeyspace(keyspaceName)


`assignKeyspace` creates the named keyspace if it doesn't exist and then calls `connection.use` on the keyspace. It is safe to call more than once on a connection object. We use it in the following pattern. Suppose we have an object holding onto a connection to a cassandra instance. We want to make sure that this connection is set up & pointing to the right keyspace before we use it.


```javascript
var self = this;

this.withKeyspace = this.connection.connect().then(function()
{
    return self.connection.assignKeyspace('my_keyspace');
});

```

This promise turns into a value for the keyspace. You can then preceed other function calls with `obj.withKeyspace.then()`. For instance, 

```javascript
obj.withKeyspace
.then(function() { return obj.connection.cql('SELECT * FROM ? ', [obj.colfamily1]); })
.then(function(rows)
{
    // do something with rows;
}).done();
```

#### keyspace.createTableAs(tableName, propertyToStoreAs, createOptions)

Sugar for fetching a column family/table object, creating it if necessary. Caches the column family directly on the keyspace object as `propertyToStoreAs`.

### Thrift

If you do not want to use CQL, you can make calls using the thrift driver

```javascript
pool.connect.then(function(keyspace)
{
    return keyspace.get('my_cf');
})
.then(function(cf)
{
    return cf.insert('foo', { bar: 'baz'});
})
.then(function()
{
    return cf.get('foo', { consistency: scamandrios.ConsistencyLevel.ONE });
})
.then(function(row)
{
    console.log(row.get('bar').value);
})
.fail(function(err)
{
    // handle any error for the entire chain
})
.done();
```

### Thrift Support

Currently scamandrios supports the following command for the thrift side of the driver:

* `connection.createKeyspace()`
* `connection.dropKeyspace()`
* `keyspace.createColumnFamily()`
* `keyspace.dropColumnFamily()`
* `columnFamily.insert()`
* `columnFamily.get()`
* `columnFamily.getIndexed()`
* `columnFamily.remove()`
* `columnFamily.truncate()`
* `columnfamily.incr()`

The focus of this fork of the driver is CQL 3.0 and its data structures. No further Thrift support is planned.

## Row

The scamandrios Row object acts like an array but contains some helper methods to
make your life a bit easier when dealing with dynamic columns in Cassandra.

### row.count

Returns the number of columns in the row

### row[N]

Returns the column at index *N*.

```javascript
results.forEach(function(row)
{
    // gets the 5th column of each row
    console.log(row[5]);
});
```

### row.get(name)

Returns the column with that specific name.

```javascript
results.forEach(function(row)
{
    //gets the column with the name 'foo' of each row
    console.log(row.get('foo'));
});
```

### row.forEach()

This is a wrapper function for `Array.forEach()` that returns name, value, ts, ttl of each column in the row as callback params.

```javascript
// for every row in a result
results.forEach(function(row)
{
    // for every column in the row
    row.forEach(function(name, value, ts, ttl)
    {
        console.log(name, value, ts, ttl);
    });
});
```

### row.slice(start, finish)

Slices columns in the row based on their numeric index, this allows you to get
columns x through y, it returns a scamandrios row object of columns that match the slice.

```javascript
results.forEach(function(row)
{
    var firstFive = row.slice(0, 5);
    console.log(firstFive);
});
```

### row.nameSlice(start, finish)

Slices the columns based on part of their column name. returns a scamandrios row of columns
that match the slice

```javascript
results.forEach(function(row)
{
        // gets all columns that start with a, b, c, or d
        console.log(row.nameSlice('a','e'));
});
```

## Column

Columns are returned as objects with the following structure:

```javascript
{
    name:      'Foo',    // the column name
    value:     'bar',    // the column value
    timestamp: Date(),   // a date object containing the timestamp for the column
    ttl:       123456    // the ttl (in milliseconds) for the columns
}
```

## ConsistencyLevel

scamandrios supports using a custom consistency level. By default, when using the thrift client reads and writes will both use `QUORUM`. When using the thrift driver, you simply pass a custom level in the options:

```javascript
cf.insert(key, values, {consistency : scamandrios.ConsistencyLevel.ANY});
```


## Contributors

* Russell Bradberry - @devdazed
* Matthias Eder - @matthiase
* Christoph Tavan - @ctavan
* C J Silverio - @ceejbot
* Kit Cambridge - @kitcambridge

## License

MIT; see provided license file for copyright information.
