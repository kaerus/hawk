
// Extract host and port from request

exports.parseHost = function (req, hostHeaderName) {

    hostHeaderName = (hostHeaderName ? hostHeaderName.toLowerCase() : 'host');
    var hostHeader = req.headers[hostHeaderName];
    if (!hostHeader) {
        return null;
    }

    var hostHeaderRegex = /^(?:(?:\r\n)?[\t ])*([^:]+)(?::(\d+))?(?:(?:\r\n)?[\t ])*$/;     // Does not support IPv6
    var hostParts = hostHeader.match(hostHeaderRegex);

    if (!hostParts ||
        hostParts.length !== 3 ||
        !hostParts[1]) {

        return null;
    }

    return {
        name: hostParts[1],
        port: (hostParts[2] ? hostParts[2] : (req.connection && req.connection.encrypted ? 443 : 80))
    };
};


// Convert node's  to request configuration object

exports.parseRequest = function (req, options) {

    if (!req.headers) {
        return req;
    }

    // Obtain host and port information

    var host = exports.parseHost(req, options.hostHeaderName);
    if (!host) {
        return new Error('Invalid Host header');
    }

    var req = {
        method: req.method,
        url: req.url,
        host: host.name,
        port: host.port,
        authorization: req.headers.authorization
    };

    return req;
};


exports.now = function () {

    return Date.now();
};


exports.inherit = function(self, parent) {
    self.super_ = parent;
    self.prototype = Object.create(parent.prototype, {
            constructor: {
                value: self,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
};

exports.parseURL = function(str) {
    var url = /^(?:([A-Za-z]+):)(\/{0,3})(?:([^\x00-\x1F\x7F:]+)?:?([^\x00-\x1F\x7F:]*)@)?([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^\x00-\x1F\x7F]+))?$/,
        u = url.exec(str);
    if(!u) return false;
    var path = /^([\w\-]+)?(?:#([\w\-]+))?(?:\:([\w\-]+))?(?:\?(.*))?$/,
        p = u[7] ? path.exec(u[7]) : null;    
    return u ? {uriparts:u,
        protocol:u[1],
        username:u[3],
        password:u[4],
        hostname:u[5],
        port:u[6],
        path:p?{
            first:p[1],
            hash:p[2],
            base:p[3],
            query:p[4],
            string:u[7]
        }:u[7]} : false;   
}




// Clone object or array

exports.clone = function (obj) {

    if (obj === null ||
        obj === undefined) {

        return null;
    }

    var newObj = (obj instanceof Array) ? [] : {};

    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            if (obj[i] instanceof Date) {
                newObj[i] = new Date(obj[i].getTime());
            }
            else if (obj[i] instanceof RegExp) {
                var flags = '' + (obj[i].global ? 'g' : '') + (obj[i].ignoreCase ? 'i' : '') + (obj[i].multiline ? 'm' : '') + (obj[i].sticky ? 'y' : '');
                newObj[i] = new RegExp(obj[i].source, flags);
            }
            else if (typeof obj[i] === 'object') {
                newObj[i] = exports.clone(obj[i]);
            }
            else {
                newObj[i] = obj[i];
            }
        }
    }

    return newObj;
};


// Merge all the properties of source into target, source wins in conflic, and by default null and undefined from source are applied

exports.merge = function (target, source, isNullOverride /* = true */, isMergeArrays /* = true */) {

    if (source) {
        if (source instanceof Array) {
            if (isMergeArrays !== false) {                                      // Defaults to true
                target = (target || []).concat(source);
            }
            else {
                target = source;
            }
        }
        else {
            target = target || {};

            for (var key in source) {
                if (source.hasOwnProperty(key)) {
                    var value = source[key];

                    if (value &&
                        typeof value === 'object') {

                        if (value instanceof Date) {
                            target[key] = new Date(value.getTime());
                        }
                        else if (value instanceof RegExp) {
                            var flags = '' + (value.global ? 'g' : '') + (value.ignoreCase ? 'i' : '') + (value.multiline ? 'm' : '') + (value.sticky ? 'y' : '');
                            target[key] = new RegExp(value.source, flags);
                        }
                        else {
                            target[key] = exports.merge(target[key], source[key], isNullOverride, isMergeArrays);
                        }
                    }
                    else {
                        if (value !== null && value !== undefined) {            // Explicit to preserve empty strings
                            target[key] = value;
                        }
                        else if (isNullOverride !== false) {                    // Defaults to true
                            target[key] = value;
                        }
                    }
                }
            }
        }
    }

    return target;
};


// Apply options to a copy of the defaults

exports.applyToDefaults = function (defaults, options) {

    if (!options) {                                                 // If no options, return null
        return null;
    }

    var copy = exports.clone(defaults);

    if (options === true) {                                         // If options is set to true, use defaults
        return copy;
    }

    return exports.merge(copy, options, false, false);
};


// Remove duplicate items from array

exports.unique = function (array, key) {

    var index = {};
    var result = [];

    for (var i = 0, il = array.length; i < il; ++i) {
        var id = (key ? array[i][key] : array[i]);
        if (index[id] !== true) {

            result.push(array[i]);
            index[id] = true;
        }
    }

    return result;
};


// Convert array into object

exports.mapToObject = function (array, key) {

    if (!array) {
        return null;
    }

    var obj = {};
    for (var i = 0, il = array.length; i < il; ++i) {
        if (key) {
            if (array[i][key]) {
                obj[array[i][key]] = true;
            }
        }
        else {
            obj[array[i]] = true;
        }
    }

    return obj;
};


// Find the common unique items in two arrays

exports.intersect = function (array1, array2) {

    if (!array1 || !array2) {
        return [];
    }

    var common = [];
    var hash = exports.mapToObject(array1);
    var found = {};
    for (var i = 0, il = array2.length; i < il; ++i) {
        if (hash[array2[i]] && !found[array2[i]]) {
            common.push(array2[i]);
            found[array2[i]] = true;
        }
    }

    return common;
};


// Find which keys are present

exports.matchKeys = function (obj, keys) {

    var matched = [];
    for (var i = 0, il = keys.length; i < il; ++i) {
        if (obj.hasOwnProperty(keys[i])) {
            matched.push(keys[i]);
        }
    }
    return matched;
};


// Flatten array

exports.flatten = function (array, target) {

    var result = target || [];

    for (var i = 0, il = array.length; i < il; ++i) {
        if (Array.isArray(array[i])) {
            exports.flatten(array[i], result);
        }
        else {
            result.push(array[i]);
        }
    }

    return result;
};


// Remove keys

exports.removeKeys = function (object, keys) {

    for (var i = 0, il = keys.length; i < il; i++) {
        delete object[keys[i]];
    }
};


// Convert an object key chain string ('a.b.c') to reference (object[a][b][c])

exports.reach = function (obj, chain) {

    var path = chain.split('.');
    var ref = obj;
    path.forEach(function (level) {

        if (ref) {
            ref = ref[level];
        }
    });

    return ref;
};


// Inherits a selected set of methods from an object, wrapping functions in asynchronous syntax and catching errors

exports.inheritAsync = function (self, obj, keys) {

    keys = keys || null;

    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            if (keys instanceof Array &&
                keys.indexOf(i) < 0) {

                continue;
            }

            self.prototype[i] = (function (fn) {

                return function (callback) {

                    var result = null;
                    try {
                        result = fn();
                    }
                    catch (err) {
                        return callback(err);
                    }

                    return callback(null, result);
                };
            })(obj[i]);
        }
    }
};


exports.callStack = function (slice) {

    // http://code.google.com/p/v8/wiki/JavaScriptStackTraceApi

    var v8 = Error.prepareStackTrace;
    Error.prepareStackTrace = function (err, stack) {

        return stack;
    };

    var capture = {};
    Error.captureStackTrace(capture, arguments.callee);
    var stack = capture.stack;

    Error.prepareStackTrace = v8;

    var trace = [];
    stack.forEach(function (item) {

        trace.push([item.getFileName(), item.getLineNumber(), item.getColumnNumber(), item.getFunctionName(), item.isConstructor()]);
    });

    if (slice) {
        return trace.slice(slice);
    }

    return trace;
};


exports.displayStack = function (slice) {

    var trace = exports.callStack(slice === undefined ? 1 : slice + 1);
    var display = [];
    trace.forEach(function (row) {

        display.push((row[4] ? 'new ' : '') + row[3] + ' (' + row[0] + ':' + row[1] + ':' + row[2] + ')');
    });

    return display;
};


exports.abort = function (message) {

    if (process.env.NODE_ENV === 'test') {
        throw new Error(message || 'Unknown error');
    }
    else {
        console.log('ABORT: ' + message + '\n\t' + exports.displayStack(1).join('\n\t'));
        process.exit(1);
    }
};


exports.assert = function (condition, message) {

    if (!condition) {
        exports.abort(message);
    }
};


exports.rename = function (obj, from, to) {

    obj[to] = obj[from];
    delete obj[from];
};


exports.Timer = function () {

    this.reset();
};


exports.Timer.prototype.reset = function () {

    this.ts = Date.now();
};


exports.Timer.prototype.elapsed = function () {

    return Date.now() - this.ts;
};

// Escape string for Regex construction

exports.escapeRegex = function (string) {

    // Escape ^$.*+-?=!:|\/()[]{},
    return string.replace(/[\^\$\.\*\+\-\?\=\!\:\|\\\/\(\)\[\]\{\}\,]/g, '\\$&');
};


// Return an error as first argument of a callback

exports.toss = function (condition /*, [message], callback */) {

    var message = (arguments.length === 3 ? arguments[1] : '');
    var callback = (arguments.length === 3 ? arguments[2] : arguments[1]);

    var err = (message instanceof Error ? message : (message ? new Error(message) : (condition instanceof Error ? condition : new Error())));

    if (condition instanceof Error ||
        !condition) {

        return callback(err);
    }
};


// Base64url (RFC 4648) encode

exports.base64urlEncode = function (value) {

    return (new Buffer(value, 'binary')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/\=/g, '');
};


// Base64url (RFC 4648) decode

exports.base64urlDecode = function (encoded) {

    if (encoded &&
        !encoded.match(/^[\w\-]*$/)) {

        return new Error('Invalid character');
    }

    try {
        return (new Buffer(encoded.replace(/-/g, '+').replace(/:/g, '/'), 'base64')).toString('binary');
    }
    catch (err) {
        return err;
    }
};


// Escape attribute value for use in HTTP header

exports.escapeHeaderAttribute = function (attribute) {

    return attribute.replace(/\\/g, '\\\\').replace(/\"/g, '\\"');
};


// Escape string for inclusion in HTML

var htmlEscaped = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
};

exports.escapeHtml = function (string) {

    if (!string) {
        return '';
    }

    if (/[&<>"'`]/.test(string) === false) {
        return string;
    }

    return string.replace(/[&<>"'`]/g, function (chr) {

        return htmlEscaped[chr];
    });
};


