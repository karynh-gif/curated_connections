// netlify/functions/stripe-sync.js
// Uses Stripe REST API directly — no npm dependency needed

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  const email = event.queryStringParameters && event.queryStringParameters.email;
  if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'email required' }) };

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Stripe not configured' }) };

  const stripeHeaders = {
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  try {
    // Find customer by email
    const custRes = await fetch('https://api.stripe.com/v1/customers?email=' + encodeURIComponent(email) + '&limit=1', {
      headers: stripeHeaders
    });
    const custData = await custRes.json();

    if (!custData.data || !custData.data.length) {
      return { statusCode: 200, headers, body: JSON.stringify({ tier: 'free', reason: 'no customer found' }) };
    }

    const customerId = custData.data[0].id;

    // Get active subscriptions
    const subRes = await fetch('https://api.stripe.com/v1/subscriptions?customer=' + customerId + '&status=active&limit=5', {
      headers: stripeHeaders
    });
    const subData = await subRes.json();

    if (!subData.data || !subData.data.length) {
      return { statusCode: 200, headers, body: JSON.stringify({ tier: 'free', reason: 'no active subscription' }) };
    }

    // Map price ID to tier using known price IDs from config.js
    const PRICE_MAP = {
      // Monthly
      'price_connect':  'connect',
      'price_insight':  'insight',
      'price_legacy':   'legacy',
    };

    // Also map by payment link — check product name as fallback
    let tier = 'connect'; // Default to connect for any active sub
    const sub = subData.data[0];
    const priceId = sub.items && sub.items.data[0] && sub.items.data[0].price && sub.items.data[0].price.id;
    const productId = sub.items && sub.items.data[0] && sub.items.data[0].price && sub.items.data[0].price.product;

    // Try to get product name to determine tier
    if (productId) {
      const prodRes = await fetch('https://api.stripe.com/v1/products/' + productId, { headers: stripeHeaders });
      const prodData = await prodRes.json();
      const name = (prodData.name || '').toLowerCase();
      if (name.includes('legacy'))       tier = 'legacy';
      else if (name.includes('insight')) tier = 'insight';
      else if (name.includes('connect')) tier = 'connect';
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ tier, customerId, priceId, subscriptionId: sub.id })
    };

  } catch (err) {
    console.error('stripe-sync error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
