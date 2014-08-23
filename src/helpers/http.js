//client-side and serverside http methods, using jquery and micheal/request respectively
var http = (function() {

	var http = {}

	//client-side environment
	if (typeof window != 'undefined' && window.screen) {

		http.get = function(url, callback, headers) {
			callback = callback || defaultcallback;
			$.ajax({
				url: url,
				headers: headers,
				success: function(result) {
					callback(trytoparse(result))
				}
			}).fail(function(e) {
				callback(e.statusText || "error")
			});
		}

		http.jsonp = function(url, callback) {
			callback = callback || defaultcallback;
			$.getJSON(url, function(result) {
				callback(trytoparse(result))
			}).fail(function(e) {
				callback(e.statusText || "error")
			});
		}

		http.post = function(url, data, callback, headers) {
			callback = callback || defaultcallback;
			$.ajax({
				type: "POST",
				url: url,
				data: data,
				headers: headers,
				success: function(result) {
					callback(trytoparse(result))
				}
			}).fail(function(e) {
				callback(e.statusText || "error")
			});
		}

		function defaultcallback(s) {
			console.log(s);
			$('body').append(JSON.stringify(s));
		}
	}
	//server-side environment
	else if (typeof module !== 'undefined' && module.exports) {
		var request = require('request');

		http.get = function(url, callback, headers) {
			callback = callback || console.log;
			request({
				uri: url,
				headers: headers
			}, function(error, response, body) {
				callback(trytoparse(body))
			})
		}

		http.post = function(url, data, callback, headers) {
			callback = callback || console.log;
			headers = headers || {};
			if (typeof data == 'object') {
				data = JSON.stringify(data);
				headers["Content-Type"] = "application/json";
			} else {
				headers["Content-Type"] = "application/x-www-form-urlencoded";
			}

			request({
				url: url,
				headers: headers,
				method: 'POST',
				body: data
			}, function(err, res, body) {
				callback(trytoparse(body));
			});
		}

	}

	function trytoparse(d) {
		try {
			return JSON.parse(d);
		} catch (e) {
			return d;
		}
	}

	// export for Node.js
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = http;
	}

	return http;

})()
