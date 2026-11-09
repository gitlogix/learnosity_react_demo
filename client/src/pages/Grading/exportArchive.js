import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { candidateName, sectionLabel } from './bulkSessions';

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

const uniqueFileName = (base, usedNames) => {
  let fileName = `${base}.pdf`;
  for (let copy = 2; usedNames.has(fileName.toLowerCase()); copy += 1) {
    fileName = `${base}_${copy}.pdf`;
  }
  usedNames.add(fileName.toLowerCase());
  return fileName;
};

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

const buildIndex = (sessions, fileBySession) => {
  const rows = [
    ['candidate', 'email', 'section', 'score', 'file'],
    ...sessions.map(session => [
      candidateName(session),
      session.email,
      sectionLabel(session),
      session.score,
      fileBySession.get(session.session_id) || '',
    ]),
  ];

  return strToU8(`﻿${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}\r\n`);
};

export const buildExportArchive = async (blob, sessions, { filesPerCandidate, addIndex }) => {
  const { pdfs, failed } = await readReportFiles(blob, sessions);

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
      const base = [candidateFileName(session), cleanName(sectionLabel(session))].filter(Boolean).join('_');
      const fileName = uniqueFileName(base, usedNames);
      files[fileName] = pdfs.get(session.session_id);
      fileBySession.set(session.session_id, fileName);
    });
  }

  if (addIndex) {
    files[INDEX_FILE] = buildIndex(sessions, fileBySession);
  }

  // PDFs are already compressed, so store them as they are
  const zipped = zipSync(files, { level: 0 });

  return {
    zip: new Blob([zipped], { type: 'application/zip' }),
    completed: generated.length,
    failed,
  };
};
