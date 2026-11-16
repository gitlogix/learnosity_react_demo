const crypto = require('crypto');
const axios = require('axios');

const JOB_TTL_MS = 24 * 60 * 60 * 1000;
const HEARTBEAT_MS = 25 * 1000;
const REACH_CHECK_MS = 60 * 1000;
const REACH_TIMEOUT_MS = 5000;
const FINISHED = ['complete', 'error'];

// Lets the reachability check tell this server apart from anything else at PUBLIC_URL
const INSTANCE_ID = crypto.randomUUID();

const jobs = new Map();     // token -> job
const clients = new Map();  // client id -> Set of open SSE responses

let warnedAboutUrl = false;
let reach = { url: null, ok: false, checkedAt: 0 };

const configuredUrl = () => {
  const url = (process.env.PUBLIC_URL || '').trim().replace(/\/+$/, '');
  if (!url) return null;

  if (!/^https:\/\//i.test(url)) {
    if (!warnedAboutUrl) {
      console.warn(`PUBLIC_URL must start with https:// for Paper API callbacks. Got "${url}", so status polling is used.`);
      warnedAboutUrl = true;
    }
    return null;
  }

  return url;
};

const checkReachable = async (url) => {
  let ok = false;
  try {
    const res = await axios.get(`${url}/paper-jobs/health`, { timeout: REACH_TIMEOUT_MS });
    ok = res.data?.instance === INSTANCE_ID;
  } catch (error) {
    ok = false;
  }

  if (ok !== reach.ok || url !== reach.url) {
    console[ok ? 'log' : 'warn'](ok
      ? `📬 Paper API callbacks on: ${url} reaches this server.`
      : `PUBLIC_URL ${url} does not reach this server (is the tunnel running?). Using status polling until it does.`);
  }
  reach = { url, ok, checkedAt: Date.now() };
};

// Only hand Learnosity a callback address that actually reaches us; a dead
// tunnel would otherwise leave the browser waiting for the fallback check.
const publicUrl = async () => {
  const url = configuredUrl();
  if (!url) return null;

  if (reach.url !== url || Date.now() - reach.checkedAt > REACH_CHECK_MS) {
    await checkReachable(url);
  }
  return reach.ok ? url : null;
};

const pruneJobs = () => {
  const cutoff = Date.now() - JOB_TTL_MS;
  jobs.forEach((job, token) => {
    if (job.createdAt < cutoff) jobs.delete(token);
  });
};

const toEvent = (job) => ({
  job_id: job.jobId,
  kind: job.kind,
  status: job.status,
  ...(job.error && { error: job.error }),
});

const send = (res, job) => {
  res.write(`event: job\ndata: ${JSON.stringify(toEvent(job))}\n\n`);
};

const notifyClient = (job) => {
  (clients.get(job.clientId) || new Set()).forEach(res => send(res, job));
};

const registerJob = async ({ clientId, userId, kind, checkStatus }) => {
  if (!clientId) return null;
  const base = await publicUrl();
  if (!base || !clientId) return null;

  pruneJobs();

  const token = crypto.randomUUID();
  const secret = crypto.randomBytes(24).toString('hex');

  jobs.set(token, {
    token,
    secret,
    clientId: String(clientId),
    userId,
    kind,
    checkStatus,
    jobId: null,
    status: 'pending',
    error: null,
    callbackReceived: false,
    createdAt: Date.now(),
  });

  return {
    token,
    callbackUrl: `${base}/paper-callback/${token}?secret=${secret}`,
  };
};

const finishJob = async (job, callbackBody) => {
  let status = callbackBody?.status;
  let error = callbackBody?.error || callbackBody?.message;

  try {
    const latest = await job.checkStatus(job.jobId, job.userId);
    status = latest.status;
    error = latest.error || latest.message;
  } catch (checkError) {
    console.error(`Paper job ${job.jobId}: status check after callback failed:`, checkError.message);
  }

  if (!FINISHED.includes(status)) {
    console.warn(`Paper job ${job.jobId}: callback received but status is "${status}"`);
    return;
  }

  job.status = status;
  job.error = status === 'error' ? (error || 'PDF generation failed') : null;
  console.log(`📬 Paper job ${job.jobId} is ${job.status}`);
  notifyClient(job);
};

const attachJobId = (token, jobId) => {
  const job = jobs.get(token);
  if (!job) return;

  job.jobId = jobId;
  if (job.callbackReceived) finishJob(job, job.callbackBody);
};

const forgetJob = (token) => jobs.delete(token);

const secretMatches = (expected, given) => {
  const a = Buffer.from(String(expected));
  const b = Buffer.from(String(given || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const handleCallback = (token, secret, body) => {
  const job = jobs.get(token);
  if (!job || !secretMatches(job.secret, secret)) return false;

  if (job.callbackReceived && FINISHED.includes(job.status)) return true; // repeat delivery

  job.callbackReceived = true;
  job.callbackBody = body;
  if (job.jobId) finishJob(job, body);
  return true;
};

const subscribe = (clientId, req, res) => {
  const id = String(clientId);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 5000\n\n');

  if (!clients.has(id)) clients.set(id, new Set());
  clients.get(id).add(res);

  jobs.forEach(job => {
    if (job.clientId === id && job.jobId && FINISHED.includes(job.status)) send(res, job);
  });

  const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);

  req.on('close', () => {
    clearInterval(heartbeat);
    const open = clients.get(id);
    if (!open) return;
    open.delete(res);
    if (open.size === 0) clients.delete(id);
  });
};

module.exports = {
  INSTANCE_ID,
  registerJob,
  attachJobId,
  forgetJob,
  handleCallback,
  subscribe,
};
