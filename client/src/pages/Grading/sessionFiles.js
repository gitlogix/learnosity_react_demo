// Files candidates uploaded in their answers. The server gets them from the
// Data API with short-lived download links, so ask again right before downloading.

const LINK_EXPIRY_SECONDS = 3600;
const PARALLEL_DOWNLOADS = 4;

export const fetchSessionFiles = async (sessionIds) => {
  const response = await fetch('/session-assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_ids: sessionIds, expiry_duration: LINK_EXPIRY_SECONDS }),
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try { message = JSON.parse(text).error || text; } catch (e) { /* plain text */ }
    throw new Error(`Could not list uploaded files: ${response.status} - ${message}`);
  }

  const { sessions } = await response.json();
  return new Map(sessions.map(session => [session.session_id.toLowerCase(), session.files]));
};

export const downloadFile = async (file) => {
  if (!file.pre_signed_url) throw new Error('No download link was returned for this file');

  const response = await fetch(file.pre_signed_url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
};


export const downloadSessionFiles = async (sessionIds, { download = true } = {}) => {
  const filesBySession = await fetchSessionFiles(sessionIds);
  if (!download) return { filesBySession, bySession: new Map(), failed: [] };

  const queue = [];
  filesBySession.forEach((files, sessionId) => files.forEach(file => queue.push({ sessionId, file })));

  const bySession = new Map();
  const failed = [];

  const worker = async () => {
    while (queue.length) {
      const { sessionId, file } = queue.shift();
      try {
        const data = await downloadFile(file);
        bySession.set(sessionId, [...(bySession.get(sessionId) || []), { name: file.name, data }]);
      } catch (error) {
        failed.push({ session_id: sessionId, name: file.name, message: error.message });
      }
    }
  };

  await Promise.all(Array.from({ length: PARALLEL_DOWNLOADS }, worker));
  return { filesBySession, bySession, failed };
};

export const formatSize = (bytes) => {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
