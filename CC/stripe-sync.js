// stripe-sync.js
// Finds a Stripe customer by email and returns their active subscription tier

exports.handler = async function(event) {
  var headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  var email = event.queryStringParameters && event.queryStringParameters.email;
  if (!email) {
    return { statusCode: 400, headers: headers, body: JSON.stringify({ error: 'email required' }) };
  }

  var key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return { statusCode: 500, headers: headers, body: JSON.stringify({ error: 'Stripe not configured' }) };
  }

  var stripeHeaders = {
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  try {
    // Find customer by email
    var custRes = await fetch('https://api.stripe.com/v1/customers?email=' + encodeURIComponent(email) + '&limit=1', {
      headers: stripeHeaders
    });
    var custData = await custRes.json();

    if (!custData.data || !custData.data.length) {
      return { statusCode: 200, headers: headers, body: JSON.stringify({ tier: 'free' }) };
    }

    var customerId = custData.data[0].id;

    // Get active subscriptions
    var subRes = await fetch('https://api.stripe.com/v1/subscriptions?customer=' + customerId + '&status=active&limit=5', {
      headers: stripeHeaders
    });
    var subData = await subRes.json();

    if (!subData.data || !subData.data.length) {
      return { statusCode: 200, headers: headers, body: JSON.stringify({ tier: 'free' }) };
    }

    // Default to connect for any active subscription
    var tier = 'connect';
    var sub = subData.data[0];
    var productId = sub.items && sub.items.data[0] && sub.items.data[0].price && sub.items.data[0].price.product;

    // Look up product name to determine tier
    if (productId) {
      var prodRes = await fetch('https://api.stripe.com/v1/products/' + productId, { headers: stripeHeaders });
      var prodData = await prodRes.json();
      var name = (prodData.name || '').toLowerCase();
      if (name.includes('legacy'))       tier = 'legacy';
      else if (name.includes('insight')) tier = 'insight';
      else if (name.includes('connect')) tier = 'connect';
    }

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({ tier: tier, customerId: customerId })
    };

  } catch (err) {
    return { statusCode: 500, headers: headers, body: JSON.stringify({ error: err.message }) };
  }
};
