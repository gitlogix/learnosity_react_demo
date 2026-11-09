const axios = require('axios');
const Learnosity = require('learnosity-sdk-nodejs/index');
const production_domain = require('../../utils/domains');

const PAPER_API_URL = 'https://paper.learnosity.com';

const signedEnvelope = (userId) => {
  let domain = 'localhost';

  if (process.env.NODE_ENV === 'production') {
    domain = production_domain.name;
  }

  const learnositySdk = new Learnosity();

  return learnositySdk.init(
    'reports',
    {
      consumer_key: process.env.CONSUMER_KEY,
      domain: domain,
    },
    process.env.CONSUMER_SECRET,
    {
      user_id: userId,
    }
  );
};

const defaultReportOptions = {
  questions_api_init_options: {
    showCorrectAnswers: true,
  },
  assessment_fields: [
    'participant_name',
    'date_started',
    'date_ended',
    'time_taken',
    'total_score',
    'max_score',
    'status',
  ],
  show_assessment_score: true,
  score_display_as: 'raw',
  display_scores: true,
  paper: {
    format: 'A4',
    margin: 'normal',
  },
};

const MAX_BULK_REPORTS = 100;

const buildReportConfig = (options, session) => ({
  ...defaultReportOptions,
  ...options,
  ...session,
});

const createReportPdf = async ({ session_id, user_id, grader_id, options }) => {
  const envelope = signedEnvelope(grader_id || user_id);

  const response = await axios.post(`${PAPER_API_URL}/api/reports/pdf`, {
    ...envelope,
    usrequest: {
      report_config: [buildReportConfig(options, { user_id, session_id })],
    },
  });

  return response.data;
};

const createBulkReportPdf = async ({ sessions, grader_id, options }) => {
  const envelope = signedEnvelope(grader_id || sessions[0].user_id);

  const response = await axios.post(`${PAPER_API_URL}/api/reports/pdf`, {
    ...envelope,
    usrequest: {
      report_config: sessions.map(({ session_id, user_id, first_name, last_name }) => buildReportConfig(options, {
        user_id,
        session_id,
        ...(first_name && { first_name }),
        ...(last_name && { last_name }),
      })),
    },
  });

  return response.data;
};

const getReportPdfStatus = async (jobId, userId) => {
  const response = await axios.post(
    `${PAPER_API_URL}/api/reports/pdf/status/${encodeURIComponent(jobId)}`,
    signedEnvelope(userId)
  );

  return response.data;
};

const downloadReportPdf = async (jobId, userId) => {
  const response = await axios.post(
    `${PAPER_API_URL}/api/reports/pdf/download/${encodeURIComponent(jobId)}`,
    signedEnvelope(userId),
    { responseType: 'stream' }
  );

  return response;
};

const createAnswerKeys = async ({ user_id, items, options }) => {
  const response = await axios.post(`${PAPER_API_URL}/api/paper/answer-keys`, {
    ...signedEnvelope(user_id),
    usrequest: {
      ...options,
      items: items.map(reference => ({ reference, included: true })),
    },
  });

  return response.data;
};

const createContentReview = async ({ user_id, items, options }) => {
  const response = await axios.post(`${PAPER_API_URL}/api/content-review/pdf`, {
    ...signedEnvelope(user_id),
    usrequest: {
      ...options,
      items: items,
    },
  });

  return response.data;
};

const createPaperDocument = async ({ user_id, items, name, options }) => {
  const response = await axios.post(`${PAPER_API_URL}/api/paper/document`, {
    ...signedEnvelope(user_id),
    usrequest: {
      ...options,
      items: items,
      name: name,
    },
  });

  const jobId = response.data.job_id || /documents\/([^/]+)/.exec(response.data.download_url)?.[1];

  return { ...response.data, job_id: jobId };
};

const getDocumentJob = async (jobId, userId) => {
  const response = await axios.post(
    `${PAPER_API_URL}/api/jobs/documents/${encodeURIComponent(jobId)}`,
    signedEnvelope(userId)
  );

  return response.data;
};

const readStream = (stream) => new Promise((resolve, reject) => {
  let body = '';
  stream.on('data', chunk => { body += chunk; });
  stream.on('end', () => resolve(body));
  stream.on('error', reject);
});

const downloadDocumentJob = async (jobId, userId) => {
  const response = await axios.post(
    `${PAPER_API_URL}/api/jobs/documents/${encodeURIComponent(jobId)}/download`,
    signedEnvelope(userId),
    { responseType: 'stream' }
  );

  if (!(response.headers['content-type'] || '').includes('application/json')) {
    return response;
  }

  const { url } = JSON.parse(await readStream(response.data));
  return axios.get(url, { responseType: 'stream' });
};

module.exports = {
  MAX_BULK_REPORTS,
  createReportPdf,
  createBulkReportPdf,
  getReportPdfStatus,
  downloadReportPdf,
  createAnswerKeys,
  createContentReview,
  createPaperDocument,
  getDocumentJob,
  downloadDocumentJob,
};
