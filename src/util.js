const request = require('request').defaults({
    headers: {
        'User-Agent': 'node request' // GitHub ask for this.
    }
});

module.exports = {
    get(url, callback){
        request.get(url, function(err, res, body){
            if (err) {
                callback(err);
                return;
            }
            if (res.statusCode != 200) {
                callback(`Failed to fetch info - ${res.statusCode}: ${res.body}`);
                return;
            }
            callback(null, body);
        });
    }
}
