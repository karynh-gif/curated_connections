// netlify/functions/play-live.js
// Play Live multiplayer engine using Airtable as session store
// Handles room creation, joining, card draws, and scoring

const AIRTABLE_BASE = 'https://api.airtable.com/v0';

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

async function atUpdate(table, recordId, fields) {
  const res = await fetch(tableURL(table, recordId), {
    method: 'PATCH',
    headers: atHeaders(),
    body: JSON.stringify({ fields }),
  });
  return res.json();
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { action, roomCode, userId, userName, gameType, cardId, answer, circleId } = JSON.parse(event.body || '{}');

  try {
    switch (action) {

      // Create a new game room
      case 'create_room': {
        const code = generateRoomCode();
        const sessionId = 'session-' + Date.now();
        
        const room = await atCreate('Game Sessions', {
          'Session ID': sessionId,
          'Game Type': gameType || 'Conversation Cards',
          'Circle ID': circleId || '',
          'Player Count': 1,
          'Rounds Played': 0,
          'Session Date': new Date().toISOString().split('T')[0],
          'Notes': JSON.stringify({
            roomCode: code,
            status: 'waiting',
            host: userId,
            hostName: userName,
            players: [{ id: userId, name: userName, score: 0 }],
            currentCard: null,
            round: 0
          })
        });

        return {
          statusCode: 200,
          body: JSON.stringify({ sessionId, roomCode: code, status: 'waiting' })
        };
      }

      // Join an existing room
      case 'join_room': {
        const sessions = await atFind('Game Sessions', `SEARCH("${roomCode}", {Notes})`);
        if (!sessions.length) {
          return { statusCode: 404, body: JSON.stringify({ error: 'Room not found' }) };
        }

        const session = sessions[0];
        const state = JSON.parse(session.fields.Notes || '{}');
        
        if (state.status !== 'waiting') {
          return { statusCode: 400, body: JSON.stringify({ error: 'Game already started' }) };
        }

        // Add player
        if (!state.players.find(p => p.id === userId)) {
          state.players.push({ id: userId, name: userName, score: 0 });
        }

        await atUpdate('Game Sessions', session.id, {
          'Player Count': state.players.length,
          'Notes': JSON.stringify(state)
        });

        return {
          statusCode: 200,
          body: JSON.stringify({
            sessionId: session.fields['Session ID'],
            roomCode,
            players: state.players,
            status: state.status
          })
        };
      }

      // Start the game
      case 'start_game': {
        const sessions = await atFind('Game Sessions', `SEARCH("${roomCode}", {Notes})`);
        if (!sessions.length) return { statusCode: 404, body: 'Room not found' };

        const session = sessions[0];
        const state = JSON.parse(session.fields.Notes || '{}');
        state.status = 'playing';
        state.round = 1;

        // Draw first card
        const cards = await atFind('Conversation Cards', `AND({Active}=TRUE, {Gather Pool}=TRUE)`);
        if (cards.length) {
          const card = cards[Math.floor(Math.random() * Math.min(cards.length, 50))];
          state.currentCard = {
            id: card.id,
            prompt: card.fields.Prompt,
            hint: card.fields.Hint || '',
            edition: card.fields.Edition || 'Family'
          };
        }

        await atUpdate('Game Sessions', session.id, { 'Notes': JSON.stringify(state) });

        return {
          statusCode: 200,
          body: JSON.stringify({ status: 'playing', round: 1, currentCard: state.currentCard, players: state.players })
        };
      }

      // Get current game state (polling)
      case 'get_state': {
        const sessions = await atFind('Game Sessions', `SEARCH("${roomCode}", {Notes})`);
        if (!sessions.length) return { statusCode: 404, body: 'Room not found' };

        const session = sessions[0];
        const state = JSON.parse(session.fields.Notes || '{}');

        return {
          statusCode: 200,
          body: JSON.stringify(state)
        };
      }

      // Submit an answer / advance round
      case 'next_card': {
        const sessions = await atFind('Game Sessions', `SEARCH("${roomCode}", {Notes})`);
        if (!sessions.length) return { statusCode: 404, body: 'Room not found' };

        const session = sessions[0];
        const state = JSON.parse(session.fields.Notes || '{}');
        state.round = (state.round || 0) + 1;

        // Draw next card
        const cards = await atFind('Conversation Cards', `AND({Active}=TRUE, {Gather Pool}=TRUE)`);
        if (cards.length) {
          const card = cards[Math.floor(Math.random() * Math.min(cards.length, 50))];
          state.currentCard = {
            id: card.id,
            prompt: card.fields.Prompt,
            hint: card.fields.Hint || '',
            edition: card.fields.Edition || 'Family'
          };
        }

        await atUpdate('Game Sessions', session.id, {
          'Rounds Played': state.round,
          'Notes': JSON.stringify(state)
        });

        return {
          statusCode: 200,
          body: JSON.stringify({ round: state.round, currentCard: state.currentCard })
        };
      }

      // End game
      case 'end_game': {
        const sessions = await atFind('Game Sessions', `SEARCH("${roomCode}", {Notes})`);
        if (!sessions.length) return { statusCode: 404, body: 'Room not found' };

        const session = sessions[0];
        const state = JSON.parse(session.fields.Notes || '{}');
        state.status = 'ended';

        await atUpdate('Game Sessions', session.id, { 'Notes': JSON.stringify(state) });
        return { statusCode: 200, body: JSON.stringify({ status: 'ended' }) };
      }

      default:
        return { statusCode: 400, body: 'Unknown action' };
    }
  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
