// Load modules

var Crypto = require('./cryptoJS/sha');
var Utils = require('./utils');


// Declare internals

var internals = {};


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

    var hmac = Crypto.createHmac(options.algorithm, options.key).update(normalized);
    var digest = hmac.digest('base64');
    return digest;
};


exports.generateNormalizedString = function (options) {

    var url = Utils.parseURL(options.uri);
    var normalized = 'hawk.' + exports.headerVersion + '.' + options.type + '\n' +
                     options.timestamp + '\n' +
                     options.nonce + '\n' +
                     options.method.toUpperCase() + '\n' +
                     (url.path.string ? url.path.string + (url.path.query || '') : url.path) + '\n' + // Maintain trailing '?'
                     options.host.toLowerCase() + '\n' +
                     options.port + '\n' +
                     (options.hash || '') + '\n' +
                     (options.ext || '') + '\n';

    return normalized;
};


exports.calculateHash = function (payload, algorithm) {
    if(!Crypto.hasOwnProperty(algorithm) && 
        typeof Crypto[algorithm] !== 'function') throw "Unsupported crypto algorithm";

    var hash = Crypto[algorithm](payload);
    var digest = hash.toString(Crypto.enc.Base64);
    return digest;
};
