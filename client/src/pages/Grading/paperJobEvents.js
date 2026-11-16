// Listens to /paper-jobs/events, where the server says when a Paper API job
// it started with a callback_url has finished.

const CLIENT_ID_KEY = 'paper-jobs-client-id';

let clientId = null;
let source = null;
const listeners = new Set();

const randomId = () => (
  window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
);

// One id per tab, so the server knows which page to tell
export const getClientId = () => {
  if (clientId) return clientId;

  try {
    clientId = sessionStorage.getItem(CLIENT_ID_KEY);
  } catch (e) {
    clientId = null;
  }

  if (!clientId) {
    clientId = randomId();
    try {
      sessionStorage.setItem(CLIENT_ID_KEY, clientId);
    } catch (e) {
      // Storage can be blocked. The id still works until the page reloads.
    }
  }

  return clientId;
};

const emit = (event) => listeners.forEach(listener => listener(event));

export const connectJobEvents = () => {
  if (source || typeof EventSource === 'undefined') return;

  source = new EventSource(`/paper-jobs/events?client_id=${encodeURIComponent(getClientId())}`);
  let dropped = false;

  source.addEventListener('job', (e) => {
    try {
      const job = JSON.parse(e.data);
      console.log('📬 Paper job event:', job);
      emit({ type: 'job', job });
    } catch (error) {
      console.warn('Ignoring a malformed job event:', e.data);
    }
  });

  // EventSource reconnects by itself. Events sent while it was down are lost
  // unless the server still has them, so check job status once it's back.
  source.onerror = () => { dropped = true; };
  source.onopen = () => {
    if (!dropped) return;
    dropped = false;
    emit({ type: 'reconnect' });
  };
};

// Resolves with the job once it is complete. Waits for the server's event, and
// also runs check() every fallbackMs and after a reconnect, in case the
// callback never arrives.
export const waitForJobEvent = (jobId, { check, fallbackMs, timeoutMs }) => new Promise((resolve, reject) => {
  let settled = false;
  let checking = false;
  let fallback = null;
  let timeout = null;

  const cleanup = () => {
    settled = true;
    listeners.delete(listener);
    clearInterval(fallback);
    clearTimeout(timeout);
  };

  const settle = (job) => {
    if (settled || !job) return;
    if (job.status === 'complete') {
      cleanup();
      resolve(job);
    } else if (job.status === 'error') {
      cleanup();
      reject(new Error(job.error || 'PDF generation failed'));
    }
  };

  const runCheck = async () => {
    if (checking || settled) return;
    checking = true;
    try {
      settle(await check());
    } catch (error) {
      console.warn('Fallback status check failed:', error.message);
    } finally {
      checking = false;
    }
  };

  function listener(event) {
    if (event.type === 'reconnect') runCheck();
    else if (event.job?.job_id === jobId) settle(event.job);
  }

  listeners.add(listener);
  connectJobEvents();
  fallback = setInterval(runCheck, fallbackMs);
  timeout = setTimeout(() => {
    cleanup();
    reject(new Error('Timed out waiting for the PDF to be generated'));
  }, timeoutMs);
});
