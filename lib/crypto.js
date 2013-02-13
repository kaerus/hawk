var Crypto = require('./cryptoJS/sha'),
    HttpError = require('./httpError'),
    Utils = require('./utils');


// MAC normalization format version

exports.headerVersion = '1';                        // Prevent comparison of mac values generated with different normalized string formats


// Supported HMAC algorithms

exports.algorithms = ['SHA1', 'SHA256'];


// Calculate the request MAC

/*
    options = {
        type: 'header',                             // 'header', 'bewit'
        key: 'aoijedoaijsdlaksjdl',
        algorithm: 'sha256',                        // 'sha1', 'sha256'
        timestamp: 1357718381034,
        nonce: 'd3d345f',
        method: 'GET',
        uri: '/resource?a=1&b=2',
        host: 'example.com',
        port: 8080,
        hash: 'U4MKKSmiVxk37JCCrAVIjV/OhB3y+NdwoCr6RShbVkE=',
        ext: 'app-specific-data'
    };
*/

exports.calculateMac = function (options) {

    var normalized = exports.generateNormalizedString(options);
    
    var hmac = Crypto.algo.HMAC.create(Crypto.algo[options.algorithm], options.key).finalize(normalized);
    var digest = hmac.toString(Crypto.enc.Base64);
    return digest;
};


exports.generateNormalizedString = function (options) {

    var normalized = 'hawk.' + exports.headerVersion + '.' + options.type + '\n' +
                     options.timestamp + '\n' +
                     options.nonce + '\n' +
                     options.method.toUpperCase() + '\n' +
                     options.uri + '\n' + // Maintain trailing '?'
                     options.host.toLowerCase() + '\n' +
                     options.port + '\n' +
                     (options.hash || '') + '\n' +
                     (options.ext || '') + '\n';

    return normalized;
};


exports.calculateHash = function (payload, algorithm) {

    if(!Crypto.hasOwnProperty(algorithm) || 
        typeof Crypto[algorithm] !== 'function') throw "Unsupported crypto: " + algorithm;

    var hash = Crypto[algorithm](payload);
    var digest = hash.toString(Crypto.enc.Base64);
    return digest;
};

exports.toBase64String = function(buffer) {
    return Crypto.enc.Utf8.parse(buffer).toString(Crypto.enc.Base64);
}

exports.randomBytes = function(n,callback){
    var bytes = [];

    if(typeof window === 'object' && window.crypto && window.crypto.getRandomValues) {
        var buf = new Uint8Array(n);
        window.crypto.getRandomValues(buf);

        for (var i = 0; i < n; i++)
            bytes.push(buf[i]);
    } else {
        for (var bytes = []; n > 0; n--)
            bytes.push(Math.floor(Math.random() * 256));
    }
    /* todo: add support for other randomizers */

    if(callback) callback(bytes);

    return bytes;
}

exports.randomString = function (size) {

    var buffer = exports.randomBits((size + 1) * 6);
    if (buffer instanceof Error) {
        return buffer;
    }

    var string = Crypto.toBase64String(buffer).replace(/\+/g, '-').replace(/\//g, '_').replace(/\=/g, '');
    return string.slice(0, size);
};


exports.randomBits = function (bits) {

    if (!bits ||
        bits < 0) {

        return HttpError.internal('Invalid random bits count');
    }

    var bytes = Math.ceil(bits / 8);
    try {
        return Crypto.randomBytes(bytes);
    }
    catch (err) {
        return HttpError.internal('Failed generating random bits: ' + err.message);
    }
};


// Compare two strings using fixed time algorithm (to prevent time-based analysis of MAC digest match)

exports.fixedTimeComparison = function (a, b) {

    var mismatch = (a.length === b.length ? 0 : 1);
    if (mismatch) {
        b = a;
    }

    for (var i = 0, il = a.length; i < il; ++i) {
        var ac = a.charCodeAt(i);
        var bc = b.charCodeAt(i);
        mismatch += (ac === bc ? 0 : 1);
    }

    return (mismatch === 0);
};
