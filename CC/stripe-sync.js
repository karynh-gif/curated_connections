// netlify/functions/stripe-sync.js
// Called after successful Stripe checkout to sync tier into the session
// Usage: fetch('/.netlify/functions/stripe-sync?email=user@email.com')

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  const email = event.queryStringParameters?.email;
  if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'email required' }) };

  try {
    // Check Stripe for active subscription by email
    const Stripe = require('stripe');
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

    // Find customer by email
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (!customers.data.length) {
      return { statusCode: 200, headers, body: JSON.stringify({ tier: 'free' }) };
    }

    const customer = customers.data[0];

    // Get active subscriptions
    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 5
    });

    if (!subs.data.length) {
      return { statusCode: 200, headers, body: JSON.stringify({ tier: 'free' }) };
    }

    // Map price ID to tier
    const PRICE_TO_TIER = {
      [process.env.STRIPE_PRICE_CONNECT]:        'connect',
      [process.env.STRIPE_PRICE_INSIGHT]:        'insight',
      [process.env.STRIPE_PRICE_LEGACY]:         'legacy',
      [process.env.STRIPE_PRICE_CONNECT_ANNUAL]: 'connect',
      [process.env.STRIPE_PRICE_INSIGHT_ANNUAL]: 'insight',
      [process.env.STRIPE_PRICE_LEGACY_ANNUAL]:  'legacy',
      // Hardcoded fallbacks from config.js
      'price_1RQx8mKp6U2lFHVnconnect': 'connect',
      'price_1RQx8mKp6U2lFHVninsight': 'insight',
      'price_1RQx8mKp6U2lFHVnlegacy':  'legacy',
    };

    let tier = 'free';
    for (const sub of subs.data) {
      const priceId = sub.items.data[0]?.price?.id;
      if (PRICE_TO_TIER[priceId]) {
        tier = PRICE_TO_TIER[priceId];
        break;
      }
      // If we can't map price ID, default to connect for any active sub
      tier = 'connect';
    }

    return { statusCode: 200, headers, body: JSON.stringify({ tier, customerId: customer.id }) };

  } catch (err) {
    console.error('stripe-sync error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
