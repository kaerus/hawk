// Load modules

var Http = require('http');
var Hawk = require('../lib/hawk');


// Declare internals

var internals = {
    credentials: {
        dh37fgj492je: {
            id: 'dh37fgj492je',                                             // Required by Hawk.getAuthorizationHeader 
            key: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
            algorithm: 'sha256',
            user: 'Steve'
        }
    }
};


// Credentials lookup function

var credentialsFunc = function (id, callback) {

    return callback(null, internals.credentials[id]);
};


// Create HTTP server

var handler = function (req, res) {
    Hawk.authenticate(req, credentialsFunc, {}, function (err, credentials, attributes) {

        res.writeHead(!err ? 200 : 401, { 'Content-Type': 'text/plain' });
        res.end(!err ? 'Hello ' + credentials.user + ' ' + attributes.ext : 'Shoosh!');
    });
};

Http.createServer(handler).listen(8000, '127.0.0.1');

function Request(options,data,callback){ 
    var url;

    if(!callback) {
        callback = data;
        data = null;
    } 
       
    if(typeof options === 'string') { 
        url = Hawk.utils.parseURL(options);

        if(!url) throw "Invalid request url";

        options = {};
    } else {
        url = Hawk.utils.parseURL(options.uri);
        delete options.uri; 
    }
    
    options.hostname = url.hostname; 
    options.port = url.port ? parseInt(url.port,10) : 80;
    options.path = '/' + (url.path.string ? url.path.string : url.path);
    if(!options.headers) options.headers = {};
    options.headers["content-length"] = data ? data.length : 0; 

    var xhr = Http.request(options,function(res) {

        if(typeof res.data !== 'object') {
            res.data = [];
            res.on('data',function(data){
                res.data[res.data.length] = data;
            });
        }   

        res.on('end',function(){
            var body;

            if(res.data.length > 0) {
                try {  
                    body = JSON.parse(res.data.join(''));
                } catch(e) {
                    body = res.data.join('');
                } 
            }  

            callback(res.statusCode>399,res,body);

        });
    }).on('error',function(error) { 
        console.log("Request failed:", error);
        callback(true,error);
    });   

    if(data) xhr.write(data);
    xhr.end();              
}

// Send unauthenticated request

Request('http://127.0.0.1:8000/resource/1?b=1&a=2', function (error, response, body) {

    console.log(response.statusCode + ': ' + body);
});


// Send authenticated request

var options = {
    uri: 'http://127.0.0.1:8000/resource/1?b=1&a=2',
    method: 'GET',
    headers: {
        authorization: Hawk.getAuthorizationHeader(internals.credentials.dh37fgj492je, 'GET', '/resource/1?b=1&a=2', '127.0.0.1', 8000, { ext: 'and welcome!' })
    }
};

console.log(options.headers.authorization);

Request(options, function (error, response, body) {

    console.log(response.statusCode + ': ' + body);
    process.exit(0);
});


