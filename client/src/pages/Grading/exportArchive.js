import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { candidateName, sectionLabel } from './bulkSessions';
import { linkUploadedFiles } from './pdfFileLinks';

const DIAGNOSTICS_FILE = 'diagnostics.json';
const INDEX_FILE = 'index.csv';

export const readReportFiles = async (blob, sessions) => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const pdfs = new Map();

  if (!/zip/i.test(blob.type)) {
    pdfs.set(sessions[0].session_id, bytes);
    return { pdfs, failed: [] };
  }

  const entries = unzipSync(bytes);
  const reports = entries[DIAGNOSTICS_FILE]
    ? JSON.parse(strFromU8(entries[DIAGNOSTICS_FILE])).report_config || []
    : [];
  const fileNames = Object.keys(entries);
  const failed = [];

  sessions.forEach(session => {
    const fileName = fileNames.find(name => name.toLowerCase().endsWith(`-${session.session_id.toLowerCase()}.pdf`));
    if (fileName) {
      pdfs.set(session.session_id, entries[fileName]);
      return;
    }

    const report = reports.find(entry => entry.session_id === session.session_id);
    failed.push({
      session_id: session.session_id,
      user_id: session.user_id,
      message: report?.issues?.message || 'Report could not be generated',
    });
  });

  return { pdfs, failed };
};

const cleanName = (text) => text
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^A-Za-z0-9-]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 60);

const candidateFileName = (session) => {
  const parts = session.first_name || session.last_name
    ? [session.last_name.toUpperCase(), session.first_name]
    : [session.name || session.user_id];

  return parts.map(cleanName).filter(Boolean).join('_');
};

const uniqueFileName = (base, usedNames, extension = 'pdf') => {
  const suffix = extension ? `.${extension}` : '';
  let fileName = `${base}${suffix}`;
  for (let copy = 2; usedNames.has(fileName.toLowerCase()); copy += 1) {
    fileName = `${base}_${copy}${suffix}`;
  }
  usedNames.add(fileName.toLowerCase());
  return fileName;
};

const splitExtension = (name) => {
  const match = /^(.*)\.([A-Za-z0-9]{1,10})$/.exec(name);
  return match ? { stem: match[1], extension: match[2].toLowerCase() } : { stem: name, extension: '' };
};

const sessionFileBase = (session) => [candidateFileName(session), cleanName(sectionLabel(session))]
  .filter(Boolean)
  .join('_');

const mergePdfs = async (pdfs) => {
  const { PDFDocument } = await import('pdf-lib');
  const merged = await PDFDocument.create();

  for (const pdf of pdfs) {
    const source = await PDFDocument.load(pdf);
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach(page => merged.addPage(page));
  }

  return merged.save();
};

const groupByCandidate = (sessions) => {
  const sectionOrder = [...new Set(sessions.map(sectionLabel))];
  const candidates = new Map();

  sessions.forEach(session => {
    candidates.set(session.user_id, [...(candidates.get(session.user_id) || []), session]);
  });

  return [...candidates.values()].map(group => [...group].sort(
    (a, b) => sectionOrder.indexOf(sectionLabel(a)) - sectionOrder.indexOf(sectionLabel(b))
  ));
};

const csvCell = (value) => {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text) && Number.isNaN(Number(text))) {
    text = `'${text}`;
  }
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const buildIndex = (sessions, fileBySession, uploadsBySession) => {
  const rows = [
    ['candidate', 'email', 'section', 'score', 'file', 'uploaded_files'],
    ...sessions.map(session => [
      candidateName(session),
      session.email,
      sectionLabel(session),
      session.score,
      fileBySession.get(session.session_id) || '',
      (uploadsBySession.get(session.session_id) || []).join('; '),
    ]),
  ];

  return strToU8(`﻿${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}\r\n`);
};

// uploads: Map(lowercased session_id -> [{ name, data }]) of files candidates uploaded in their answers
// fileLinks: Map(lowercased session_id -> file list from /session-assets), used to make the file links in the PDFs work
export const buildExportArchive = async (blob, sessions, {
  filesPerCandidate,
  addIndex,
  uploads = new Map(),
  fileLinks = new Map(),
}) => {
  const { pdfs, failed } = await readReportFiles(blob, sessions);

  for (const session of sessions) {
    const files = fileLinks.get(session.session_id.toLowerCase());
    if (!pdfs.has(session.session_id) || !files?.length) continue;
    try {
      pdfs.set(session.session_id, await linkUploadedFiles(pdfs.get(session.session_id), files));
    } catch (error) {
      console.warn(`Could not link uploaded files in the PDF for ${session.session_id}:`, error);
    }
  }

  if (pdfs.size === 0) {
    return { zip: null, completed: 0, failed };
  }

  const generated = sessions.filter(session => pdfs.has(session.session_id));
  const usedNames = new Set();
  const fileBySession = new Map();
  const files = {};

  if (filesPerCandidate) {
    for (const group of groupByCandidate(generated)) {
      const fileName = uniqueFileName(candidateFileName(group[0]), usedNames);
      files[fileName] = group.length === 1
        ? pdfs.get(group[0].session_id)
        : await mergePdfs(group.map(session => pdfs.get(session.session_id)));
      group.forEach(session => fileBySession.set(session.session_id, fileName));
    }
  } else {
    generated.forEach(session => {
      const fileName = uniqueFileName(sessionFileBase(session), usedNames);
      files[fileName] = pdfs.get(session.session_id);
      fileBySession.set(session.session_id, fileName);
    });
  }

  // Uploaded files sit next to the PDFs, named after the candidate and section they belong to
  const uploadsBySession = new Map();
  sessions.forEach(session => {
    (uploads.get(session.session_id.toLowerCase()) || []).forEach(upload => {
      const { stem, extension } = splitExtension(upload.name);
      const base = [sessionFileBase(session), cleanName(stem)].filter(Boolean).join('_');
      const fileName = uniqueFileName(base, usedNames, extension);
      files[fileName] = upload.data;
      uploadsBySession.set(session.session_id, [...(uploadsBySession.get(session.session_id) || []), fileName]);
    });
  });

  if (addIndex) {
    files[INDEX_FILE] = buildIndex(sessions, fileBySession, uploadsBySession);
  }

  // PDFs are already compressed, so store them as they are
  const zipped = zipSync(files, { level: 0 });

  return {
    zip: new Blob([zipped], { type: 'application/zip' }),
    completed: generated.length,
    uploadCount: [...uploadsBySession.values()].reduce((total, names) => total + names.length, 0),
    failed,
  };
};
