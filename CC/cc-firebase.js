// cc-firebase.js — Curated Connections™
// Shared Firebase / Firestore sync layer
// Include AFTER the Firebase SDK scripts on any page that needs cloud sync
//
// Usage:
//   CCFB.saveJournalEntry(entry)      → saves to Firestore + localStorage
//   CCFB.loadJournalEntries()         → returns Promise<entries[]>
//   CCFB.saveCircle(circle)           → saves to Firestore + localStorage
//   CCFB.loadCircles()                → returns Promise<circles[]>
//   CCFB.saveTreeNode(treeKey, nodeId, data)
//   CCFB.loadTree(treeKey)            → returns Promise<treeObj>
//   CCFB.saveCardResponse(response)

window.CCFB = (function() {

  var FB_CONFIG = {
    apiKey:            "AIzaSyB6wEldIMuAlcnEE9EGnZJ8hufWFFwmDbQ",
    authDomain:        "curated-connections-dcf01.firebaseapp.com",
    databaseURL:       "https://curated-connections-dcf01-default-rtdb.firebaseio.com",
    projectId:         "curated-connections-dcf01",
    storageBucket:     "curated-connections-dcf01.firebasestorage.app",
    messagingSenderId: "472185773381",
    appId:             "1:472185773381:web:0b53e6dd7b0b54a317722c"
  };

  var db = null;
  var auth = null;

  function init() {
    try {
      if (typeof firebase === 'undefined') return false;
      if (!firebase.apps.length) {
        firebase.initializeApp(FB_CONFIG);
      }
      db   = firebase.firestore();
      auth = firebase.auth();
      return true;
    } catch(e) {
      console.warn('CCFB: Firebase init error', e);
      return false;
    }
  }

  function getUid() {
    // Try Firebase auth first, then localStorage session
    if (auth && auth.currentUser) return auth.currentUser.uid;
    try {
      var u = JSON.parse(localStorage.getItem('cc_user') || 'null');
      return u && u.user_id ? u.user_id : null;
    } catch(e) { return null; }
  }

  function userRef() {
    var uid = getUid();
    if (!db || !uid) return null;
    return db.collection('users').doc(uid);
  }

  // ── JOURNAL ────────────────────────────────────────────────

  async function saveJournalEntry(entry) {
    // Always write to localStorage first (instant)
    var uid = getUid() || 'guest';
    var key = 'cc_journal_' + uid;
    var entries = [];
    try { entries = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) {}
    // Avoid duplicates
    entries = entries.filter(function(e) { return e.id !== entry.id; });
    entries.unshift(entry);
    if (entries.length > 200) entries = entries.slice(0, 200);
    localStorage.setItem(key, JSON.stringify(entries));

    // Write to Firestore async
    var ref = userRef();
    if (!ref) return;
    try {
      await ref.collection('journal').doc(String(entry.id)).set({
        prompt:    entry.prompt || '',
        text:      entry.text   || '',
        date:      entry.date   || new Date().toISOString(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch(e) {
      console.warn('CCFB: journal write error', e);
    }
  }

  async function loadJournalEntries() {
    var ref = userRef();
    if (!ref) {
      // Fall back to localStorage
      var uid = getUid() || 'guest';
      try { return JSON.parse(localStorage.getItem('cc_journal_' + uid) || '[]'); } catch(e) { return []; }
    }
    try {
      var snap = await ref.collection('journal').orderBy('date', 'desc').limit(200).get();
      var entries = snap.docs.map(function(doc) {
        var d = doc.data();
        return { id: doc.id, prompt: d.prompt, text: d.text, date: d.date };
      });
      // Sync back to localStorage
      var uid = getUid() || 'guest';
      localStorage.setItem('cc_journal_' + uid, JSON.stringify(entries));
      return entries;
    } catch(e) {
      console.warn('CCFB: journal load error', e);
      var uid = getUid() || 'guest';
      try { return JSON.parse(localStorage.getItem('cc_journal_' + uid) || '[]'); } catch(e2) { return []; }
    }
  }

  async function deleteJournalEntry(entryId) {
    var uid = getUid() || 'guest';
    var key = 'cc_journal_' + uid;
    var entries = [];
    try { entries = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) {}
    entries = entries.filter(function(e) { return String(e.id) !== String(entryId); });
    localStorage.setItem(key, JSON.stringify(entries));

    var ref = userRef();
    if (!ref) return;
    try { await ref.collection('journal').doc(String(entryId)).delete(); } catch(e) {}
  }

  // ── CIRCLES ────────────────────────────────────────────────

  async function saveCircle(circle) {
    // localStorage first
    var circles = [];
    try { circles = JSON.parse(localStorage.getItem('cc_circles') || '[]'); } catch(e) {}
    circles = circles.filter(function(c) { return c.id !== circle.id; });
    circles.push(circle);
    localStorage.setItem('cc_circles', JSON.stringify(circles));

    var ref = userRef();
    if (!ref) return;
    try {
      await ref.collection('circles').doc(circle.id).set({
        name:       circle.name       || '',
        type:       circle.type       || 'custom',
        created_at: circle.created_at || new Date().toISOString(),
        createdAt:  firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch(e) {
      console.warn('CCFB: circle write error', e);
    }
  }

  async function loadCircles() {
    var ref = userRef();
    if (!ref) {
      try { return JSON.parse(localStorage.getItem('cc_circles') || '[]'); } catch(e) { return []; }
    }
    try {
      var snap = await ref.collection('circles').orderBy('created_at').get();
      var circles = snap.docs.map(function(doc) {
        var d = doc.data();
        return { id: doc.id, name: d.name, type: d.type, created_at: d.created_at };
      });
      localStorage.setItem('cc_circles', JSON.stringify(circles));
      return circles;
    } catch(e) {
      console.warn('CCFB: circles load error', e);
      try { return JSON.parse(localStorage.getItem('cc_circles') || '[]'); } catch(e2) { return []; }
    }
  }

  async function deleteCircle(circleId) {
    var circles = [];
    try { circles = JSON.parse(localStorage.getItem('cc_circles') || '[]'); } catch(e) {}
    circles = circles.filter(function(c) { return c.id !== circleId; });
    localStorage.setItem('cc_circles', JSON.stringify(circles));

    var ref = userRef();
    if (!ref) return;
    try { await ref.collection('circles').doc(circleId).delete(); } catch(e) {}
  }

  // ── FAMILY TREE ────────────────────────────────────────────

  async function saveTreeNode(treeKey, nodeId, data) {
    // Save full tree to localStorage
    var lsKey = 'cc_tree_' + treeKey;
    var tree = {};
    try { tree = JSON.parse(localStorage.getItem(lsKey) || '{}'); } catch(e) {}
    tree[nodeId] = data;
    localStorage.setItem(lsKey, JSON.stringify(tree));

    var ref = userRef();
    if (!ref) return;
    try {
      await ref.collection('trees').doc(treeKey)
               .collection('nodes').doc(nodeId).set({
        name:      data.name      || '',
        years:     data.years     || '',
        rel:       data.rel       || '',
        color:     data.color     || '#c97d3a',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch(e) {
      console.warn('CCFB: tree node write error', e);
    }
  }

  async function loadTree(treeKey) {
    var lsKey = 'cc_tree_' + treeKey;
    var ref = userRef();
    if (!ref) {
      try { return JSON.parse(localStorage.getItem(lsKey) || '{}'); } catch(e) { return {}; }
    }
    try {
      var snap = await ref.collection('trees').doc(treeKey).collection('nodes').get();
      var tree = {};
      snap.docs.forEach(function(doc) {
        tree[doc.id] = doc.data();
      });
      if (Object.keys(tree).length > 0) {
        localStorage.setItem(lsKey, JSON.stringify(tree));
      } else {
        // Nothing in Firestore — use localStorage
        try { tree = JSON.parse(localStorage.getItem(lsKey) || '{}'); } catch(e) {}
      }
      return tree;
    } catch(e) {
      console.warn('CCFB: tree load error', e);
      try { return JSON.parse(localStorage.getItem(lsKey) || '{}'); } catch(e2) { return {}; }
    }
  }

  // ── CARD RESPONSES ─────────────────────────────────────────

  async function saveCardResponse(response) {
    var uid = getUid() || 'guest';
    var key = 'cc_responses_' + uid;
    var responses = [];
    try { responses = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) {}
    responses.unshift(response);
    if (responses.length > 500) responses = responses.slice(0, 500);
    localStorage.setItem(key, JSON.stringify(responses));

    var ref = userRef();
    if (!ref) return;
    try {
      await ref.collection('responses').doc(String(response.id || Date.now())).set({
        prompt:    response.prompt    || '',
        text:      response.text      || '',
        cardId:    response.cardId    || '',
        circleId:  response.circleId  || '',
        date:      response.date      || new Date().toISOString(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch(e) {
      console.warn('CCFB: response write error', e);
    }
  }

  // ── CIRCLE FEED POSTS ──────────────────────────────────────

  async function saveCirclePost(circleId, post) {
    var key = 'cc_feed_' + circleId;
    var posts = [];
    try { posts = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) {}
    posts.unshift(post);
    if (posts.length > 100) posts = posts.slice(0, 100);
    localStorage.setItem(key, JSON.stringify(posts));

    var ref = userRef();
    if (!ref) return;
    try {
      await ref.collection('circle_posts').add({
        circleId:  circleId,
        prompt:    post.prompt || '',
        text:      post.text   || '',
        user:      post.user   || '',
        date:      post.date   || new Date().toISOString(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch(e) {
      console.warn('CCFB: circle post write error', e);
    }
  }

  // ── INIT ───────────────────────────────────────────────────
  init();

  return {
    init:               init,
    getUid:             getUid,
    saveJournalEntry:   saveJournalEntry,
    loadJournalEntries: loadJournalEntries,
    deleteJournalEntry: deleteJournalEntry,
    saveCircle:         saveCircle,
    loadCircles:        loadCircles,
    deleteCircle:       deleteCircle,
    saveTreeNode:       saveTreeNode,
    loadTree:           loadTree,
    saveCardResponse:   saveCardResponse,
    saveCirclePost:     saveCirclePost
  };

})();
