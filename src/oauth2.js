////////oauth2 support for mqlwrite

// export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    var freebase = require("./core");
    var http = require('./helpers/http');
}

freebase.OAuth2CodeAuthorizationFlowStrategy = function OAuth2CodeAuthorizationFlowStrategy() {
    if (this.constructor !== OAuth2CodeAuthorizationFlowStrategy) {
        return new freebase.OAuth2CodeAuthorizationFlowStrategy();
    }
}

freebase.OAuth2CodeAuthorizationFlowStrategy.prototype.canRefreshToken = function(oauth2) {
    return true;
}

freebase.OAuth2CodeAuthorizationFlowStrategy.prototype.refreshToken = function(oauth2){
    var url = 'https://accounts.google.com/o/oauth2/token';
    var body = {
        'refresh_token': oauth2.token.refresh_token,
        'client_id': oauth2.options.client_id,
        'client_secret': oauth2.options.client_secret,
        'grant_type': 'refresh_token'
    };

    var postData = Object.keys(body).reduce(function(a,k){a.push(k+'='+encodeURIComponent(body[k]));return a;},[]).join('&');
    http.post(url, postData, function(result) {
        if (!result.error) {
            oauth2.token.access_token = result.access_token;
            oauth2.token.expires_in = result.expires_in;
            oauth2.token.expires_at = oauth2.calculateExpiryDate(new Date());
            oauth2.storeToken(oauth2.token);
        } else {
            throw result.error;
        }
    });
}

freebase.OAuth2 = function OAuth2(options, loadToken, storeToken, strategy) {
    if (this.constructor !== OAuth2) {
        return new OAuth2(options, loadToken, storeToken, strategy);
    } else {
        this.options = options;
        loadToken = loadToken || function() { return {}; };
        this.storeToken = storeToken;
        this.strategy = strategy;
        this.token = loadToken();
        this.token.expires_at = this.token.expires_at || this.calculateExpiryDate();
    }
};

freebase.OAuth2.prototype.onAccessTokenInvalid = function() {
    this.token.expires_at = new Date();
};

freebase.OAuth2.prototype.getAccessToken = function() {
    if (this.isAccessTokenExpired() && this.strategy && this.strategy.canRefreshToken(this)) {
        this.strategy.refreshToken(this);
    }

    return this.token;
};

freebase.OAuth2.prototype.isAccessTokenExpired = function() {
    if (!this.token.expires_at) {
        return true;
    } else {
        var now = new Date();
        var expiry = new Date(this.token.expires_at);
        expiry.setSeconds(expiry.getSeconds() - 30);
        return expiry <= now;
    }
};

freebase.OAuth2.prototype.calculateExpiryDate = function(createdAt) {
    if (createdAt && this.token.expires_in) {
        var d = new Date(createdAt);
        d.setSeconds(d.getSeconds() + this.token.expires_in);
        return d;
    }

    // Not enough information about expire - assume immediate invalidity.
    var n = new Date();
    n.setSeconds(n.getSeconds() - 1);
    return n;
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = freebase;
}
