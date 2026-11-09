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
const gradingRoute = require('./controllers/Assessment/grading');
const {
  MAX_BULK_REPORTS,
  createReportPdf,
  createBulkReportPdf,
  getReportPdfStatus,
  downloadReportPdf,
  createAnswerKeys,
  createContentReview,
  createPaperDocument,
  getDocumentJob,
  downloadDocumentJob
} = require('./controllers/Assessment/reportPdf');
const cors = require('cors');

require('dotenv').config();

const PORT = process.env.PORT || 5050;

const app = express();
app.use(cors());
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

app.post('/grading-api', (req, res) => {
  try {
    console.log('req.body', req.body);
    const { session_id,activity_id, student_id, items, grader_id, state } = req.body;
    
    if (!session_id || !student_id) {
      return res.status(400).json({ 
        error: 'session_id and student_id are required for grading' 
      });
    }
    
    const result = gradingRoute(session_id, activity_id,student_id, items, state, grader_id);
    
    res.json({
      request: result.request,
      appConfig: JSON.parse(result.appConfig),
      config: {
        items: result.items,
        sessionId: result.session_id,
        studentId: result.student_id,
        graderId: result.grader_id
      }
    });
    
  } catch(error) {
    console.error('Grading API error:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to initialize grading interface'
    });
  }
});

// Pass Paper API errors back to the client with their original status where possible
const sendPaperApiError = (res, error) => {
  const details = error.response?.data;

  // No response means the Paper API was never reached. Node leaves message empty
  // when every address for a host fails, so fall back to the error code.
  if (!error.response && error.config?.url) {
    const reason = error.message || error.code || 'connection failed';
    const message = `Could not reach Paper API at ${error.config.url}: ${reason}`;
    console.error('Paper API error:', message);
    return res.status(502).json({ error: message });
  }

  console.error('Paper API error:', error.response?.status, details || error.message);
  res.status(error.response?.status || 500).json({
    error: details?.message || details?.error || error.message,
    details: typeof details === 'object' ? details : undefined
  });
};

app.post('/report-pdf', async (req, res) => {
  try {
    console.log('Route /report-pdf has been called.');
    const { session_id, user_id, grader_id, options } = req.body;

    if (!session_id || !user_id) {
      return res.status(400).json({
        error: 'session_id and user_id are required to generate a report PDF'
      });
    }

    res.json(await createReportPdf({ session_id, user_id, grader_id, options }));
  } catch (error) {
    sendPaperApiError(res, error);
  }
});

app.post('/report-pdf/bulk', async (req, res) => {
  try {
    console.log('Route /report-pdf/bulk has been called.');
    const { sessions, grader_id, options } = req.body;

    if (!Array.isArray(sessions) || sessions.length === 0 || sessions.length > MAX_BULK_REPORTS) {
      return res.status(400).json({
        error: `sessions must contain between 1 and ${MAX_BULK_REPORTS} entries`
      });
    }

    if (sessions.some(session => !session?.session_id || !session?.user_id)) {
      return res.status(400).json({
        error: 'Every session needs a session_id and a user_id'
      });
    }

    // A repeated session makes the Paper API fail the whole batch
    const sessionIds = sessions.map(session => String(session.session_id).toLowerCase());
    if (new Set(sessionIds).size !== sessionIds.length) {
      return res.status(400).json({
        error: 'Each session can only appear once in a batch'
      });
    }

    res.json(await createBulkReportPdf({ sessions, grader_id, options }));
  } catch (error) {
    sendPaperApiError(res, error);
  }
});

app.post('/report-pdf/status/:job_id', async (req, res) => {
  try {
    res.json(await getReportPdfStatus(req.params.job_id, req.body.user_id));
  } catch (error) {
    sendPaperApiError(res, error);
  }
});

// Send a Paper API file to the client, keeping its type and filename
const sendPaperFile = (res, response) => {
  res.setHeader('Content-Type', response.headers['content-type'] || 'application/pdf');
  if (response.headers['content-disposition']) {
    res.setHeader('Content-Disposition', response.headers['content-disposition']);
  }
  response.data.pipe(res);
};

// Error bodies arrive as a stream on requests made with responseType: 'stream'
const sendPaperDownloadError = (res, error) => {
  const stream = error.response?.data;
  if (stream && typeof stream.on === 'function') {
    let body = '';
    stream.on('data', chunk => { body += chunk; });
    stream.on('end', () => {
      try { error.response.data = JSON.parse(body); } catch (e) { error.response.data = { error: body }; }
      sendPaperApiError(res, error);
    });
    return;
  }
  sendPaperApiError(res, error);
};

app.post('/report-pdf/download/:job_id', async (req, res) => {
  try {
    sendPaperFile(res, await downloadReportPdf(req.params.job_id, req.body.user_id));
  } catch (error) {
    sendPaperDownloadError(res, error);
  }
});

app.post('/paper-documents/answer-keys', async (req, res) => {
  try {
    console.log('Route /paper-documents/answer-keys has been called.');
    const { user_id, items, options } = req.body;

    if (!user_id || !items?.length) {
      return res.status(400).json({
        error: 'user_id and items are required to generate answer keys'
      });
    }

    res.json(await createAnswerKeys({ user_id, items, options }));
  } catch (error) {
    sendPaperApiError(res, error);
  }
});

app.post('/paper-documents/content-review', async (req, res) => {
  try {
    console.log('Route /paper-documents/content-review has been called.');
    const { user_id, items, options } = req.body;

    if (!user_id || !items?.length) {
      return res.status(400).json({
        error: 'user_id and items are required to generate a content review'
      });
    }

    res.json(await createContentReview({ user_id, items, options }));
  } catch (error) {
    sendPaperApiError(res, error);
  }
});

app.post('/paper-documents/paper', async (req, res) => {
  try {
    console.log('Route /paper-documents/paper has been called.');
    const { user_id, items, name, options } = req.body;

    if (!user_id || !items?.length || !name) {
      return res.status(400).json({
        error: 'user_id, items and name are required to generate a paper document'
      });
    }

    res.json(await createPaperDocument({ user_id, items, name, options }));
  } catch (error) {
    sendPaperApiError(res, error);
  }
});

app.post('/paper-documents/:job_id/status', async (req, res) => {
  try {
    res.json(await getDocumentJob(req.params.job_id, req.body.user_id));
  } catch (error) {
    sendPaperApiError(res, error);
  }
});

app.post('/paper-documents/:job_id/download', async (req, res) => {
  try {
    sendPaperFile(res, await downloadDocumentJob(req.params.job_id, req.body.user_id));
  } catch (error) {
    sendPaperDownloadError(res, error);
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
