// netlify/functions/stripe-webhook.js
// Handles Stripe subscription lifecycle events.
// Updates Users.subscription_tier and Subscriptions table in Airtable.
// Requires: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, AIRTABLE_API_KEY, AIRTABLE_BASE_ID

const crypto = require("crypto");

const AIRTABLE_BASE = "https://api.airtable.com/v0";

function atHeaders() {
  return {
    "Authorization": `Bearer ${process.env.AIRTABLE_API_KEY}`,
    "Content-Type":  "application/json",
  };
}

function tableURL(t, id) {
  const b = `${AIRTABLE_BASE}/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(t)}`;
  return id ? `${b}/${id}` : b;
}

async function atFind(table, formula) {
  const url = new URL(tableURL(table));
  url.searchParams.set("filterByFormula", formula);
  const res = await fetch(url.toString(), { headers: atHeaders() });
  const d   = await res.json();
  return d.records || [];
}

async function atUpdate(table, recordId, fields) {
  await fetch(tableURL(table, recordId), {
    method:  "PATCH",
    headers: atHeaders(),
    body:    JSON.stringify({ fields }),
  });
}

async function atCreate(table, fields) {
  const res = await fetch(tableURL(table), {
    method:  "POST",
    headers: atHeaders(),
    body:    JSON.stringify({ fields }),
  });
  return res.json();
}

// Map Stripe price IDs to tier slugs
// Keep these in sync with your Stripe dashboard price IDs
const PRICE_TO_TIER = {
  // Fill in your real price IDs here or set as env vars:
  [process.env.STRIPE_PRICE_CONNECT]:      "connect",
  [process.env.STRIPE_PRICE_INSIGHT]:      "insight",
  [process.env.STRIPE_PRICE_DEEP_CONNECT]: "deep_connect",
};

function verifyStripeSignature(rawBody, sig, secret) {
  const parts     = sig.split(",");
  const timestamp = parts.find(p => p.startsWith("t="))?.split("=")[1];
  const v1sig     = parts.find(p => p.startsWith("v1="))?.split("=")[1];
  if (!timestamp || !v1sig) return false;

  const payload   = `${timestamp}.${rawBody}`;
  const expected  = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1sig, "hex"));
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const sig = event.headers["stripe-signature"];
  if (!sig) return { statusCode: 400, body: "Missing stripe-signature" };

  const isValid = verifyStripeSignature(
    event.body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );
  if (!isValid) {
    console.error("Invalid Stripe signature");
    return { statusCode: 400, body: "Invalid signature" };
  }

  let stripeEvent;
  try {
    stripeEvent = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const obj = stripeEvent.data?.object;

  try {
    switch (stripeEvent.type) {

      // ── Payment succeeded / subscription created ─────────
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const customerId = obj.customer;
        const priceId    = obj.items?.data?.[0]?.price?.id;
        const tier       = PRICE_TO_TIER[priceId] || "connect";
        const status     = obj.status; // active, trialing, past_due, etc.
        const periodEnd  = new Date(obj.current_period_end * 1000).toISOString().split("T")[0];
        const subId      = obj.id;

        // Find user by stripe_customer_id
        const users = await atFind("Users", `{stripe_customer_id}="${customerId}"`);
        if (users.length) {
          const user = users[0];
          // Update tier on the user record
          await atUpdate("Users", user.id, {
            subscription_tier:      status === "active" || status === "trialing" ? tier : "free",
            stripe_subscription_id: subId,
          });
          // Upsert subscription record
          const existing = await atFind("Subscriptions", `{stripe_subscription_id}="${subId}"`);
          if (existing.length) {
            await atUpdate("Subscriptions", existing[0].id, {
              tier, status, current_period_end: periodEnd,
            });
          } else {
            await atCreate("Subscriptions", {
              sub_id:                 crypto.randomUUID(),
              user_id:                user.fields.user_id,
              stripe_subscription_id: subId,
              tier, status,
              current_period_end:     periodEnd,
              created_at:             new Date().toISOString().split("T")[0],
            });
          }
        }
        break;
      }

      // ── Subscription cancelled / expired ─────────────────
      case "customer.subscription.deleted": {
        const customerId = obj.customer;
        const subId      = obj.id;

        const users = await atFind("Users", `{stripe_customer_id}="${customerId}"`);
        if (users.length) {
          await atUpdate("Users", users[0].id, {
            subscription_tier:      "free",
            stripe_subscription_id: "",
          });
        }
        const subs = await atFind("Subscriptions", `{stripe_subscription_id}="${subId}"`);
        if (subs.length) {
          await atUpdate("Subscriptions", subs[0].id, { status: "cancelled" });
        }
        break;
      }

      // ── Checkout completed — link customer ID + handle leaf seal/reopen ──
      case "checkout.session.completed": {
        const email           = obj.customer_details?.email;
        const customerId      = obj.customer;
        const clientRef       = obj.client_reference_id || "";
        const amountTotal     = obj.amount_total || 0;

        // Link Stripe customer ID to user record
        if (email && customerId) {
          const users = await atFind("Users", `{email}="${email}"`);
          if (users.length) {
            await atUpdate("Users", users[0].id, { stripe_customer_id: customerId });
          }
        }

        // Handle leaf seal payment: client_reference_id = "seal_LEAFID"
        if (clientRef.startsWith("seal_")) {
          const leafId = clientRef.replace("seal_", "");
          const today  = new Date().toISOString().split("T")[0];

          // Find the leaf record in Living Legacy Leaves
          const leaves = await atFind("Living Legacy Leaves", `{Leaf ID}="${leafId}"`);
          if (leaves.length) {
            await atUpdate("Living Legacy Leaves", leaves[0].id, {
              "Leaf Status":   "Sealed",
              "Sealed Date":   today,
              "Seal Payment Amount": amountTotal / 100
            });
          }

          // Create a Leaf Payment record
          await atCreate("Leaf Payments", {
            "Payment ID":       "lp_" + leafId + "_" + Date.now(),
            "Leaf ID":          leafId,
            "Payment Type":     amountTotal >= 9000 ? "seal_large" : "seal_standard",
            "Amount":           amountTotal / 100,
            "Stripe Session ID": obj.id,
            "Status":           "completed",
            "Leaf Status Before": "Active",
            "Leaf Status After":  "Sealed",
            "Payment Date":     today
          });
        }

        // Handle leaf reopen payment: client_reference_id = "reopen_LEAFID"
        if (clientRef.startsWith("reopen_")) {
          const leafId = clientRef.replace("reopen_", "");
          const today  = new Date().toISOString().split("T")[0];
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + 30);
          const expiryDate = expiry.toISOString().split("T")[0];

          const leaves = await atFind("Living Legacy Leaves", `{Leaf ID}="${leafId}"`);
          if (leaves.length) {
            const currentReopens = leaves[0].fields["Reopen Count"] || 0;
            await atUpdate("Living Legacy Leaves", leaves[0].id, {
              "Leaf Status":          "Active",
              "Reopen Count":         currentReopens + 1,
              "Reopen Window Expires": expiryDate
            });
          }

          await atCreate("Leaf Payments", {
            "Payment ID":       "lp_" + leafId + "_" + Date.now(),
            "Leaf ID":          leafId,
            "Payment Type":     "reopen_30day",
            "Amount":           4.99,
            "Stripe Session ID": obj.id,
            "Status":           "completed",
            "Leaf Status Before": "Sealed",
            "Leaf Status After":  "Active",
            "Reopen Expires":   expiryDate,
            "Payment Date":     today
          });
        }

        // Handle single leaf monthly subscription
        if (clientRef.startsWith("monthly_")) {
          const leafId = clientRef.replace("monthly_", "");
          const today  = new Date().toISOString().split("T")[0];
          const leaves = await atFind("Living Legacy Leaves", `{Leaf ID}="${leafId}"`);
          if (leaves.length) {
            await atUpdate("Living Legacy Leaves", leaves[0].id, {
              "Leaf Status":         "Active",
              "Subscription Status": "Active"
            });
          }
          await atCreate("Leaf Payments", {
            "Payment ID":        "lp_" + leafId + "_" + Date.now(),
            "Leaf ID":           leafId,
            "Payment Type":      "reopen_30day",
            "Amount":            obj.amount_total ? obj.amount_total / 100 : 0,
            "Stripe Session ID": obj.id,
            "Status":            "completed",
            "Leaf Status Before":"Read Only",
            "Leaf Status After": "Active",
            "Payment Date":      today
          });
        }

        break;
      }

      default:
        // Unhandled event type — ignore silently
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
