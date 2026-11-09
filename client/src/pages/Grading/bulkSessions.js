import { readSheet } from 'read-excel-file/universal';

export const MAX_BULK_SESSIONS = 100;

// Columns the export understands. Any other column is kept in extra.
const COLUMN_NAMES = {
  session_id: ['session_id', 'sessionid', 'session'],
  activity_id: ['activity_id', 'activityid', 'activity'],
  user_id: ['user_id', 'userid', 'student_id', 'studentid', 'user', 'student'],
  first_name: ['first_name', 'firstname'],
  last_name: ['last_name', 'lastname'],
  name: ['name', 'candidate', 'candidate_name', 'full_name'],
  email: ['email', 'e_mail', 'mail'],
  section: ['section', 'section_name'],
  status: ['status', 'session_status'],
  score: ['score', 'total_score'],
  max_score: ['max_score', 'maximum_score'],
};

const REQUIRED_COLUMNS = ['session_id', 'activity_id', 'user_id'];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cellText = (cell) => {
  if (cell === null || cell === undefined) return '';
  if (cell instanceof Date) return cell.toISOString().slice(0, 16).replace('T', ' ');
  return String(cell).trim();
};

const normalizeHeader = (cell) => cellText(cell).toLowerCase().replace(/[\s-]+/g, '_');

const findColumns = (headerRow) => {
  const headers = headerRow.map(normalizeHeader);
  const columns = {};

  Object.keys(COLUMN_NAMES).forEach(column => {
    const index = headers.findIndex(header => COLUMN_NAMES[column].includes(header));
    if (index !== -1) columns[column] = index;
  });

  return columns;
};

const findExtraColumns = (headerRow, columns) => {
  const known = Object.values(columns);

  return headerRow
    .map((cell, index) => ({ label: cellText(cell), index }))
    .filter(column => column.label && !known.includes(column.index));
};

// rows is the sheet as an array of rows, each an array of cells.
// Every row is checked so the reader sees all the problems in one pass.
export const parseSessionRows = (rows) => {
  const headerIndex = rows.findIndex(row => row.some(cell => cellText(cell)));
  if (headerIndex === -1) {
    return { sessions: [], issues: [], error: 'This file is empty.' };
  }

  const columns = findColumns(rows[headerIndex]);
  const missing = REQUIRED_COLUMNS.filter(column => columns[column] === undefined);
  if (missing.length > 0) {
    return {
      sessions: [],
      issues: [],
      error: `Missing column: ${missing.join(', ')}. The first row must contain the column names.`,
    };
  }

  const extraColumns = findExtraColumns(rows[headerIndex], columns);
  const sessions = [];
  const issues = [];
  const firstRowBySession = new Map();
  const read = (row, column) => (columns[column] === undefined ? '' : cellText(row[columns[column]]));

  rows.slice(headerIndex + 1).forEach((row, offset) => {
    if (!row.some(cell => cellText(cell))) return;

    const rowNumber = headerIndex + offset + 2;
    const session_id = read(row, 'session_id');
    const activity_id = read(row, 'activity_id');
    const user_id = read(row, 'user_id');

    if (!session_id) {
      issues.push({ row: rowNumber, message: 'Session ID is empty' });
    } else if (!UUID_PATTERN.test(session_id)) {
      issues.push({ row: rowNumber, message: `Session ID "${session_id}" is not valid` });
    } else if (!activity_id) {
      issues.push({ row: rowNumber, message: 'Activity ID is empty' });
    } else if (!user_id) {
      issues.push({ row: rowNumber, message: 'User ID is empty' });
    } else if (firstRowBySession.has(session_id.toLowerCase())) {
      issues.push({
        row: rowNumber,
        message: `Duplicate of row ${firstRowBySession.get(session_id.toLowerCase())}`,
      });
    } else {
      firstRowBySession.set(session_id.toLowerCase(), rowNumber);
      sessions.push({
        session_id,
        activity_id,
        user_id,
        first_name: read(row, 'first_name'),
        last_name: read(row, 'last_name'),
        name: read(row, 'name'),
        email: read(row, 'email'),
        section: read(row, 'section'),
        status: read(row, 'status'),
        score: read(row, 'score'),
        max_score: read(row, 'max_score'),
        extra: extraColumns
          .map(column => ({ label: column.label, value: cellText(row[column.index]) }))
          .filter(field => field.value),
      });
    }
  });

  if (sessions.length === 0 && issues.length === 0) {
    return { sessions, issues, error: 'This file has no sessions in it.' };
  }

  return { sessions, issues, error: null };
};

export const readSessionsFile = async (file) => {
  if (!/\.xlsx$/i.test(file.name)) {
    return { sessions: [], issues: [], error: 'Please choose an .xlsx file. In Excel, use Save As and pick Excel Workbook.' };
  }

  try {
    return parseSessionRows(await readSheet(file));
  } catch (error) {
    console.error('Could not read sessions file:', error);
    return { sessions: [], issues: [], error: 'This file could not be read. Check that it is a valid Excel workbook.' };
  }
};

export const candidateName = (session) => (
  [session.first_name, session.last_name].filter(Boolean).join(' ') || session.name || session.user_id
);

export const sectionLabel = (session) => session.section || session.activity_id;

export const isCompleted = (session) => !session.status || session.status.toLowerCase() === 'completed';
