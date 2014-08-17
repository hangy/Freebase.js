////////oauth2 support for mqlwrite

// export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    var freebase = require("./core");
    var http = require('./helpers/http');
};

freebase.OAuth2 = function OAuth2(options, loadToken, storeToken) {
    this.options = options;
    loadToken = loadToken || function() { return {}; };
    this.storeToken = storeToken;
    this.token = loadToken();
    this.token.expires_at = this.token.expires_at || this.calculateExpiryDate();
};

freebase.OAuth2.prototype.getAccessToken = function() {
    if (this.isAccessTokenExpired()) {
        this.refreshAccessToken();
    }

    return this.token;
};

freebase.OAuth2.prototype.isAccessTokenExpired = function() {
return true;
    if (!this.token.expires_at) {
        return true;
    } else {
        var now = new Date();
        var expiry = new Date(this.token.expires_at);
        expiry.setSeconds(expiry.getSeconds() - 30);
        return expiry <= now;
    }
};

freebase.OAuth2.prototype.refreshAccessToken = function() {
    var url = 'https://accounts.google.com/o/oauth2/token';
    var body = {
        'refresh_token': this.token.refresh_token,
        'client_id': this.options.client_id,
        'client_secret': this.options.client_secret,
        'grant_type': 'refresh_token'
    };
    var oauth2 = this;

    var postData = Object.keys(body).reduce(function(a,k){a.push(k+'='+encodeURIComponent(body[k]));return a},[]).join('&');
    http.post(url, postData, function(result) {
        if (!result.error) {
            oauth2.token.access_token = result.access_token;
            oauth2.token.expires_in = result.expires_in;
            oauth2.token.expires_at = oauth2.calculateExpiryDate();
            oauth2.storeToken(oauth2.token);
        }
    });
};

freebase.OAuth2.prototype.calculateExpiryDate = function(createdAt) {
    var d = createdAt || new Date();
    if (this.token.expires_in) {
        d.setSeconds(d.getSeconds() + this.token.expires_in);
    }

    return d;
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = freebase
}
