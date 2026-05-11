// netlify/functions/circle-invite.js
// Generates and validates Circle invite links
// POST { action: 'generate', circleId, circleName, hostUserId }
// POST { action: 'validate', token }
// POST { action: 'join', token, userId, userName }

const AIRTABLE_BASE = 'https://api.airtable.com/v0';
const crypto = require('crypto');

function atHeaders() {
  return {
    'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

function tableURL(t, id) {
  const b = `${AIRTABLE_BASE}/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(t)}`;
  return id ? `${b}/${id}` : b;
}

async function atFind(table, formula) {
  const url = new URL(tableURL(table));
  url.searchParams.set('filterByFormula', formula);
  const res = await fetch(url.toString(), { headers: atHeaders() });
  const d = await res.json();
  return d.records || [];
}

async function atCreate(table, fields) {
  const res = await fetch(tableURL(table), {
    method: 'POST',
    headers: atHeaders(),
    body: JSON.stringify({ fields }),
  });
  return res.json();
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const { action, circleId, circleName, hostUserId, token, userId, userName } = JSON.parse(event.body || '{}');
  const baseUrl = process.env.INVITE_BASE_URL || 'https://joincuratedconnections.com';

  try {
    switch (action) {

      case 'generate': {
        // Create a unique invite token
        const inviteToken = crypto.randomBytes(16).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

        // Store token in Airtable Referrals table (reusing for invites)
        await atCreate('Referrals', {
          'Referral Code': inviteToken,
          'Referrer User ID': hostUserId,
          'Status': 'pending',
          'Notes': JSON.stringify({ circleId, circleName, expiresAt, type: 'circle_invite' })
        });

        const inviteUrl = `${baseUrl}/circle-join.html?token=${inviteToken}&circle=${encodeURIComponent(circleName)}`;

        return {
          statusCode: 200,
          body: JSON.stringify({ inviteUrl, token: inviteToken, expiresAt })
        };
      }

      case 'validate': {
        if (!token) return { statusCode: 400, body: 'Token required' };

        const invites = await atFind('Referrals', `{Referral Code}="${token}"`);
        if (!invites.length) return { statusCode: 404, body: JSON.stringify({ valid: false, error: 'Invite not found' }) };

        const invite = invites[0];
        const meta = JSON.parse(invite.fields.Notes || '{}');

        if (new Date(meta.expiresAt) < new Date()) {
          return { statusCode: 200, body: JSON.stringify({ valid: false, error: 'Invite expired' }) };
        }

        return {
          statusCode: 200,
          body: JSON.stringify({
            valid: true,
            circleId: meta.circleId,
            circleName: meta.circleName,
            hostUserId: invite.fields['Referrer User ID']
          })
        };
      }

      case 'join': {
        if (!token || !userId) return { statusCode: 400, body: 'Token and userId required' };

        const invites = await atFind('Referrals', `{Referral Code}="${token}"`);
        if (!invites.length) return { statusCode: 404, body: 'Invite not found' };

        const invite = invites[0];
        const meta = JSON.parse(invite.fields.Notes || '{}');

        // Mark invite as used
        await fetch(tableURL('Referrals', invite.id), {
          method: 'PATCH',
          headers: atHeaders(),
          body: JSON.stringify({ fields: { 'Status': 'converted', 'Referred Name': userName } })
        });

        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            circleId: meta.circleId,
            circleName: meta.circleName
          })
        };
      }

      default:
        return { statusCode: 400, body: 'Unknown action' };
    }
  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
