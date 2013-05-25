# Scamandrios

A promises API for Cassandra, forked from [helenus](https://github.com/simplereach/helenus). Helenus was Cassandra's twin brother. He was also known as Scamandrios.

[![Build Status](https://secure.travis-ci.org/ceejbot/scamandrios.png)](http://travis-ci.org/ceejbot/scamandrios)

## Installation

`npm install scamandrios`

The tests require cassandra to be running on `localhost:9160`.

`make test`

For coverage:

`make test-cov`

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
        cqlVersion : '3.0.0', // optional
        getHost    : getHostFunc, // optional
});
```

Specify the `cqlVersion` parameter if you are using Cassandra 1.1 and want to use CQL 3.

You can supply a function in the `getHost` parameter to override the random host selection that the pool will perform when handling a request. __NOTE:__ We intend to replace the pool implementation with one based on [poolee](https://github.com/dannycoates/poolee), so overriding will eventually be impossible as well as somethg you probably won't ever feel the need to do.

As with most error-emitting objects in node, if you do not listen for `error` it will bubble up to `process.uncaughtException`.

```javascript
pool.on('error', function(err)
{
    console.error(err.name, err.message);
});
```

All asynchronous operations return promises in lieu of taking callbacks. The promises library used is [P](https://github.com/rkatic/p), which is Promises/A+ spec compliant. Here's an example of making a CQL query:

```javascript
pool.connect.then(function()
{
    pool.cql('SELECT col FROM cf_one WHERE key = ?', ['key123']).then(function(result)
    {
        console.log(result);
    });
})
```

The first argument to `cql()` is the query string. The second is an array of items to interpolate into the query string, which is accomplished using [util.format()](http://nodejs.org/docs/latest/api/util.html#util.format). The result is an array of Row objects. You can always skip quotes around placeholders. Quotes are added automatically. In CQL3 you cannot use placeholders for ColumnFamily or Column names.

### Thrift

If you do not want to use CQL, you can make calls using the thrift driver

```javascript
pool.connect.then(function(keyspace)
{
    keyspace.get('my_cf').then(function(cf)
    {
        cf.insert('foo', { bar: 'baz'}).then(function()
        {
            cf.get('foo', { consistency: scamandrios.ConsistencyLevel.ONE }).then(function(row)
            {
                console.log(row.get('bar').value);
            }, function(err)
            {
                // handle any errors for the entire chain
            });
        });
    });
});
```

### Thrift Support

Currently scamandrios supports the following command for the thrift side of the driver:

* connection.createKeyspace
* connection.dropKeyspace
* keyspace.createColumnFamily
* keyspace.dropColumnFamily
* columnFamily.insert
* columnFamily.get
* columnFamily.getIndexed
* columnFamily.remove
* columnFamily.truncate
* columnfamily.incr

The following support is going to be added in later releases:

* columnFamily.rowCount
* columnFamily.columnCount
* SuperColumns
* CounterColumns
* Better composite support

## Row

The scamandrios Row object acts like an array but contains some helper methods to
make your life a bit easier when dealing with dynamic columns in Cassandra

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

This is wrapper function of Array.forEach which return name,value,ts,ttl of column from row as callback params.

        results.forEach(function(row){
            //all row of result
            row.forEach(function(name,value,ts,ttl){
                //all column of row
                console.log(name,value,ts,ttl);
            });

        });

### row.slice(start, finish)

Slices columns in the row based on their numeric index, this allows you to get
columns x through y, it returns a scamandrios row object of columns that match the slice.

        results.forEach(function(row){
            //gets the first 5 columns of each row
            console.log(row.slice(0,5));
        });

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

(The MIT License)

Copyright (c) 2011 SimpleReach &lt;rbradberry@simplereach.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
