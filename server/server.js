const path = require('path');
const express = require('express');
const reportsQuestions = require('./controllers/reportsRoute');
const sessionReportInfo = require('./controllers/sessionReport');
const assess = require('./controllers/Assessment/assessRoute');
const item = require('./controllers/Assessment/ItemRoute');
const author = require('./controllers/author/authorItemList');
const welcome = require('./controllers/welcomeRoute');
const authorMultipleItemRoute = require('./controllers/author/authorMultipleItemRoute');
const authorCreateItem = require('./controllers/author/authorCreateItem');
const authorCreateActivity = require('./controllers/author/authorCreateActivity');
const feedbackRoute = require('./controllers/feedbackRoute');


require('dotenv').config();

const PORT = process.env.PORT || 6666;

const app = express();

// parse requests of content-type: application/json
app.use(express.json());

// parse requests of content-type: application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

app.get('/welcome', async (req, res) => {
  try {
    console.log('Route /welcome has been called.');
    res.json(welcome());
  } catch (err) {
    res.status(500).json(err);
  }
});

app.post('/item-loader', async (req, res) => {
  try {
    const ActivityId = req.body.act;
    const userId = req.body.uid;
    const itemId = req.body.item;
    console.log('Route /assess has been called.');
    res.json(item(ActivityId, userId, itemId));
  } catch (err) {
    res.status(500).json(err);
  }
});

app.post('/activity-loader', async (req, res) => {
  try {
    const ActivityId = req.body.act;
    const userId = req.body.uid;
    console.log('Route /assess has been called.');
    res.json(assess(ActivityId, userId, req.body.labelBundle));
  } catch (err) {
    res.status(500).json(err);
  }
});

app.get('/author', async (req, res) => {
  try {
    console.log('Route /author has been called.');
    res.json(author());
  } catch (err) {
    res.status(200).json(err);
  }
});

app.get('/author/item-create', async (req, res) => {
  try {
    console.log('Route /author has been called.');
    res.json(authorCreateItem());
  } catch (err) {
    res.status(200).json(err);
  }
});

app.get('/author/activity-create', async (req, res) => {
  try {
    console.log('Route /author has been called.');
    res.json(authorCreateActivity());
  } catch (err) {
    res.status(200).json(err);
  }
});

app.get('/author/multi-item', async (req, res) => {
  try {
    console.log('Route /authorMultipleItemRoute has been called.');
    res.json(authorMultipleItemRoute());
  } catch (err) {
    res.status(200).json(err);
  }
});

app.post('/reports-questions', async (req, res) => {
  try {
    console.log('Route /reports has been called.');
    res.json(reportsQuestions(req.body.session_id, req.body.user_id));
  } catch (err) {
    res.status(500).json(err);
  }
});

app.post('/feedback', async (req, res) => {
  try {
    console.log('Route /reports has been called.');
    res.json(feedbackRoute(req.body));
  } catch (err) {
    res.status(500).json(err);
  }
});

app.post('/session-info', async (req, res) => {
  try {
    console.log('Route /session has been called.');
    res.json(sessionReportInfo(req.body.session_id, req.body.user_id));
  } catch (err) {
    res.status(500).json(err);
  }
});

// if in production then serve client/build as static assets
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// All other GET requests not handled by the set routes will return the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

app.listen(PORT, () => {
  console.log(
    `\n------------------------\n\nServer is running:   http://localhost:${PORT}      👀\n` +
    `\n------------------------\n`
  );
});
