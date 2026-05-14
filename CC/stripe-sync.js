// stripe-sync.js — uses Node https module (esbuild compatible)
var https = require('https');

function stripeGet(path, key) {
  return new Promise(function(resolve, reject) {
    var options = {
      hostname: 'api.stripe.com',
      path: path,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + key
      }
    };
    var req = https.request(options, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

exports.handler = function(event, context, callback) {
  var headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  var email = event.queryStringParameters && event.queryStringParameters.email;
  if (!email) {
    return callback(null, { statusCode: 400, headers: headers, body: JSON.stringify({ error: 'email required' }) });
  }

  var key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return callback(null, { statusCode: 500, headers: headers, body: JSON.stringify({ error: 'Stripe not configured' }) });
  }

  stripeGet('/v1/customers?email=' + encodeURIComponent(email) + '&limit=1', key)
    .then(function(custData) {
      if (!custData.data || !custData.data.length) {
        return callback(null, { statusCode: 200, headers: headers, body: JSON.stringify({ tier: 'free' }) });
      }
      var customerId = custData.data[0].id;
      return stripeGet('/v1/subscriptions?customer=' + customerId + '&status=active&limit=5', key)
        .then(function(subData) {
          if (!subData.data || !subData.data.length) {
            return callback(null, { statusCode: 200, headers: headers, body: JSON.stringify({ tier: 'free' }) });
          }
          var sub = subData.data[0];
          var productId = sub.items && sub.items.data[0] && sub.items.data[0].price && sub.items.data[0].price.product;
          if (!productId) {
            return callback(null, { statusCode: 200, headers: headers, body: JSON.stringify({ tier: 'connect' }) });
          }
          return stripeGet('/v1/products/' + productId, key)
            .then(function(prodData) {
              var name = (prodData.name || '').toLowerCase();
              var tier = name.includes('legacy') ? 'legacy' : name.includes('insight') ? 'insight' : 'connect';
              callback(null, { statusCode: 200, headers: headers, body: JSON.stringify({ tier: tier, customerId: customerId }) });
            });
        });
    })
    .catch(function(err) {
      callback(null, { statusCode: 500, headers: headers, body: JSON.stringify({ error: err.message }) });
    });
};
