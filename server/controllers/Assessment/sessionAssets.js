const crypto = require('crypto');
const axios = require('axios');
const DataApi = require('learnosity-sdk-nodejs/lib/DataApi');
const production_domain = require('../../utils/domains');

const dataApiUrl = () => `https://data.learnosity.com/${process.env.DATA_API_VERSION || 'latest-lts'}`;

const MAX_SESSIONS = 100;
const SESSIONS_PER_REQUEST = 25;
const ASSET_PATHS_PER_REQUEST = 50;
const RESPONSES_PAGE_LIMIT = 50;

const DEFAULT_EXPIRY_SECONDS = 3600;
const MIN_EXPIRY_SECONDS = 60;
const MAX_EXPIRY_SECONDS = 604800;

const securityPacket = () => ({
  consumer_key: process.env.CONSUMER_KEY,
  domain: process.env.NODE_ENV === 'production' ? production_domain.name : 'localhost',
});

const dataApi = new DataApi();

const chunk = (list, size) => {
  const chunks = [];
  for (let i = 0; i < list.length; i += size) chunks.push(list.slice(i, i + size));
  return chunks;
};

const fetchAll = async (endpoint, request) => {
  const results = [];
  for await (const page of dataApi.requestIter(
    `${dataApiUrl()}/${endpoint}`,
    securityPacket(),
    process.env.CONSUMER_SECRET,
    request,
    'get'
  )) {
    results.push(...(Array.isArray(page.data) ? page.data : []));
  }
  return results;
};

const sessionIdOf = (record) => String(record?.session_id || record?.response_id || '').split('_')[0];

const collectFiles = (records) => {
  const files = [];

  records.forEach(record => {
    const responses = Array.isArray(record?.responses) ? record.responses : [record];

    responses.forEach(entry => {
      const values = entry?.response?.value;
      if (!Array.isArray(values)) return;

      values.forEach(value => {
        if (!value?.assetPath) return;
        files.push({
          session_id: sessionIdOf(entry) || sessionIdOf(record),
          user_id: entry?.user_id ?? record?.user_id ?? null,
          response_id: entry?.response_id ?? null,
          item_reference: entry?.item_reference ?? null,
          question_type: entry?.question_type || entry?.question?.type || entry?.type || null,
          name: value.originalName || value.name || value.assetPath.split('/').pop(),
          extension: value.extension || null,
          size: value.size ?? null,
          assetPath: value.assetPath,
        });
      });
    });
  });

  return files;
};

const fetchPreSignedUrls = async (assetPaths, expiryDuration) => {
  const urlByPath = new Map();

  for (const paths of chunk(assetPaths, ASSET_PATHS_PER_REQUEST)) {
    const results = await fetchAll('assets', { asset_paths: paths, expiry_duration: expiryDuration });
    results.forEach(result => {
      if (result?.asset_path) urlByPath.set(result.asset_path, result.pre_signed_url || null);
    });
  }

  return urlByPath;
};

const appUrl = () => {
  if (process.env.APP_URL) return process.env.APP_URL.trim().replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production') return `https://${production_domain.name}`;
  return `http://localhost:${process.env.PORT || 5050}`;
};

const linkKey = () => crypto
  .createHmac('sha256', process.env.FILE_LINK_SECRET || process.env.CONSUMER_SECRET || '')
  .update('uploaded-file-links')
  .digest();

const sign = (payload) => crypto.createHmac('sha256', linkKey()).update(payload).digest('base64url');

const fileLink = (file) => {
  const payload = Buffer.from(JSON.stringify({ p: file.assetPath, n: file.name })).toString('base64url');
  return `${appUrl()}/uploaded-file/${payload}.${sign(payload)}`;
};

// Returns { assetPath, name } for a valid link token, otherwise null
const readFileLink = (token) => {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;

  try {
    const { p, n } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return p ? { assetPath: p, name: n || p.split('/').pop() } : null;
  } catch (error) {
    return null;
  }
};

const openUploadedFile = async (token) => {
  const file = readFileLink(token);
  if (!file) return null;

  const urls = await fetchPreSignedUrls([file.assetPath], MIN_EXPIRY_SECONDS);
  const url = urls.get(file.assetPath);
  if (!url) throw new Error('Learnosity did not return a download link for this file');

  const response = await axios.get(url, { responseType: 'stream' });
  return { name: file.name, response };
};

const toExpiry = (value) => {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return DEFAULT_EXPIRY_SECONDS;
  return Math.min(MAX_EXPIRY_SECONDS, Math.max(MIN_EXPIRY_SECONDS, Math.round(seconds)));
};


const getSessionAssets = async ({ session_ids, expiry_duration }) => {
  const sessionIds = [...new Set(session_ids.map(id => String(id).trim()).filter(Boolean))];
  const expiryDuration = toExpiry(expiry_duration ?? DEFAULT_EXPIRY_SECONDS);

  const records = [];
  for (const ids of chunk(sessionIds, SESSIONS_PER_REQUEST)) {
    records.push(...await fetchAll('sessions/responses', { session_id: ids, limit: RESPONSES_PAGE_LIMIT }));
  }

  const files = collectFiles(records);
  const urlByPath = files.length
    ? await fetchPreSignedUrls([...new Set(files.map(file => file.assetPath))], expiryDuration)
    : new Map();

  const bySession = new Map(sessionIds.map(id => [id.toLowerCase(), { session_id: id, user_id: null, files: [] }]));
  records.forEach(record => {
    const session = bySession.get(sessionIdOf(record).toLowerCase());
    if (session && !session.user_id && record?.user_id) session.user_id = String(record.user_id);
  });
  files.forEach(file => {
    const session = bySession.get(String(file.session_id).toLowerCase());
    if (!session) return;
    if (!session.user_id && file.user_id) session.user_id = String(file.user_id);
    session.files.push({ ...file, pre_signed_url: urlByPath.get(file.assetPath) || null, open_url: fileLink(file) });
  });

  return {
    expiry_duration: expiryDuration,
    sessions: [...bySession.values()],
  };
};

module.exports = {
  MAX_SESSIONS,
  getSessionAssets,
  openUploadedFile,
};
