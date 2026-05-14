// netlify/functions/stripe-sync.js
// Uses Node built-in https — no npm packages required
var https = require('https');

function stripeGet(path, key, cb) {
  var opts = {
    hostname: 'api.stripe.com',
    path: path,
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + key }
  };
  var data = '';
  var req = https.request(opts, function(res) {
    res.on('data', function(c){ data += c; });
    res.on('end', function(){ cb(null, JSON.parse(data)); });
  });
  req.on('error', cb);
  req.end();
}

exports.handler = function(event, context, cb) {
  var headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  var email = event.queryStringParameters && event.queryStringParameters.email;
  if (!email) return cb(null, { statusCode:400, headers:headers, body:JSON.stringify({error:'email required'}) });
  var key = process.env.STRIPE_SECRET_KEY;
  if (!key) return cb(null, { statusCode:500, headers:headers, body:JSON.stringify({error:'not configured'}) });

  stripeGet('/v1/customers?email=' + encodeURIComponent(email) + '&limit=1', key, function(err, cust) {
    if (err || !cust.data || !cust.data.length) return cb(null, { statusCode:200, headers:headers, body:JSON.stringify({tier:'free'}) });
    var customerId = cust.data[0].id;

    stripeGet('/v1/subscriptions?customer=' + customerId + '&status=active&limit=1', key, function(err, subs) {
      if (err || !subs.data || !subs.data.length) return cb(null, { statusCode:200, headers:headers, body:JSON.stringify({tier:'free'}) });
      var productId = subs.data[0].items && subs.data[0].items.data[0] && subs.data[0].items.data[0].price && subs.data[0].items.data[0].price.product;
      if (!productId) return cb(null, { statusCode:200, headers:headers, body:JSON.stringify({tier:'connect'}) });

      stripeGet('/v1/products/' + productId, key, function(err, prod) {
        var name = prod && prod.name ? prod.name.toLowerCase() : '';
        var tier = name.includes('legacy') ? 'legacy' : name.includes('insight') ? 'insight' : 'connect';
        cb(null, { statusCode:200, headers:headers, body:JSON.stringify({tier:tier, customerId:customerId}) });
      });
    });
  });
};
