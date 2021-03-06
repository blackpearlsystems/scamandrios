/*global describe:true, it:true, before:true, after:true */

var
    demand      = require('must'),
    _           = require('lodash'),
    P           = require('p-promise'),
    scamandrios = require('../index'),
    sinon       = require('sinon'),
    util        = require('util')
    ;

var seedNode = '172.16.9.37:9160';
var proxySeed = 'cassint.discovery.inf.blackpearlsystems.net:9160';
var fullRing = [ "172.16.22.114", "172.16.9.37", "172.16.38.120" ];

if (process.env.TRAVIS)
{
    seedNode = 'localhost';
    proxySeed = 'localhost';
    fullRing = [ 'localhost:9160' ];
}


describe('ring discovery', function()
{
    describe('discover()', function()
    {
        it('returns a list of IP addresses', function(done)
        {
            scamandrios.discover(seedNode)
            .then(function(list)
            {
                Array.isArray(list).must.be.true();
                list.length.must.equal(fullRing.length);
                _.each(list, function(item)
                {
                    item.must.be.a.string();
                    fullRing.indexOf(item).must.be.above(-1);
                });
                done();
            })
            .fail(function(err)
            {
                demand(err).be.undefined();
            }).done();
        });

        it('can take object input', function(done)
        {
            var node = { host: '172.16.9.37', port: '9160' };
            scamandrios.discover(node)
            .then(function(list)
            {
                Array.isArray(list).must.be.true();
                list.length.must.equal(fullRing.length);
                done();
            })
            .fail(function(err)
            {
                demand(err).be.undefined();
            }).done();
        });

        it('respects the lookupSeed option', function(done)
        {
            var node = { host: 'cassint.discovery.inf.blackpearlsystems.net', port: '9160', lookupSeed: true };
            scamandrios.discover(node)
            .then(function(list)
            {
                Array.isArray(list).must.be.true();
                list.length.must.equal(fullRing.length);
                done();
            })
            .fail(function(err)
            {
                demand(err).be.undefined();
            }).done();
        });
    });

    describe('discoverPool()', function()
    {
        it('demands a seed host argument', function()
        {
            function shouldThrow() { return scamandrios.discoverPool(); }
            shouldThrow.must.throw(/seed host/);
        });

        it('demands an options argument', function()
        {
            function shouldThrow() { return scamandrios.discoverPool(seedNode); }
            shouldThrow.must.throw(/connection options/);
        });

        it('returns a Pool object', function(done)
        {
            scamandrios.discoverPool(seedNode, {})
            .then(function(result)
            {
                result.must.exist();
                result.must.be.an.instanceof(scamandrios.ConnectionPool);
                result.hosts.length.must.equal(fullRing.length);
                done();
            })
            .fail(function(err)
            {
                demand(err).be.undefined();
            }).done();
        });

    });
});
