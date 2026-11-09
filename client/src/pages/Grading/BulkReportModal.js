import React, { useEffect, useRef, useState } from 'react';
import ReportOptionsModal, { defaultReportOptions, modalStyles } from './ReportOptionsModal';
import {
  MAX_BULK_SESSIONS,
  candidateName,
  isCompleted,
  readSessionsFile,
  sectionLabel,
} from './bulkSessions';
import { buildExportArchive } from './exportArchive';

const TEMPLATE_PATH = '/bulk-sessions-template.xlsx';
const EXPORT_FILE_NAME = 'answer-sheets.zip';
const BRAND_COLOR = '#ff9f1c';

const styles = {
  ...modalStyles,
  titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '22px',
    lineHeight: 1,
    cursor: 'pointer',
    color: '#555',
    padding: '0 2px',
  },
  subtitle: { margin: '6px 0 0', fontSize: '14px', color: '#555', wordBreak: 'break-word' },
  dropzone: {
    border: '2px dashed #ccc',
    borderRadius: '8px',
    padding: '32px 16px',
    textAlign: 'center',
    cursor: 'pointer',
    margin: '12px 0',
    width: '100%',
    backgroundColor: 'transparent',
  },
  dropzoneActive: { borderColor: BRAND_COLOR, backgroundColor: '#fff7ec' },
  group: { display: 'flex', flexWrap: 'wrap', gap: '4px 16px', padding: '14px 0', borderBottom: '1px solid #e5e5e5' },
  exportDialog: {
    ...modalStyles.dialog,
    maxWidth: '640px',
    borderRadius: '10px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
  },
  exportHeader: { padding: '24px 28px 14px', borderBottom: '1px solid #e5e5e5' },
  exportTitle: { margin: 0, fontSize: '22px', fontWeight: 700, color: '#222' },
  exportBody: { ...modalStyles.body, padding: '0 28px' },
  groupLabel: { width: '110px', fontSize: '12px', fontWeight: 700, letterSpacing: '1.5px', color: '#333', paddingTop: '3px' },
  groupBody: { flex: '1 1 300px', minWidth: 0 },
  choice: { display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', marginBottom: '8px', wordBreak: 'break-word' },
  sections: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 16px', marginTop: '4px' },
  sectionsLabel: { fontSize: '14px', color: '#555' },
  list: { maxHeight: '160px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px', padding: '8px', margin: '4px 0 8px' },
  footerNote: { flex: '1 1 200px', fontSize: '13px', color: '#555', alignSelf: 'center' },
  footerRow: {
    padding: '12px 20px',
    borderTop: '1px solid #dee2e6',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    backgroundColor: 'white',
    color: '#b45309',
    border: '1px solid #ff9f1c',
    borderRadius: '6px',
    padding: '10px 18px',
    cursor: 'pointer',
  },
  linkButton: { background: 'none', border: 'none', color: '#117a8b', padding: 0, cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' },
  alert: {
    backgroundColor: '#fee',
    border: '1px solid #fcc',
    color: '#c00',
    padding: '10px 12px',
    borderRadius: '4px',
    fontSize: '14px',
    margin: '12px 0',
  },
  skipped: { fontSize: '13px', padding: '10px 0', borderBottom: '1px solid #e5e5e5' },
  notice: {
    position: 'fixed',
    right: '16px',
    bottom: '16px',
    width: 'calc(100% - 32px)',
    maxWidth: '380px',
    maxHeight: '60vh',
    overflowY: 'auto',
    backgroundColor: 'white',
    color: '#333',
    textAlign: 'left',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
    padding: '14px 16px',
    zIndex: 10000,
    fontSize: '14px',
  },
  failedRow: { borderTop: '1px solid #eee', padding: '6px 0', fontSize: '13px', wordBreak: 'break-word' },
};

const startButtonStyle = (disabled) => ({
  backgroundColor: BRAND_COLOR,
  color: 'white',
  fontWeight: 'bold',
  border: 'none',
  borderRadius: '6px',
  padding: '10px 18px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.6 : 1,
});

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

const distinct = (values) => [...new Set(values)];

const initialChoices = {
  scope: 'completed',
  selectedIds: [],
  excludedSections: [],
  correctAnswers: true,
  itemScores: true,
  filesPerCandidate: false,
  addIndex: true,
  reportOptions: null,
};

const BulkReportModal = ({ open, job, onClose, onGenerate, onSave }) => {
  const [step, setStep] = useState('upload');
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState(null);
  const [choices, setChoices] = useState(initialChoices);
  const [run, setRun] = useState(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef(null);

  const choose = (changes) => setChoices(prev => ({ ...prev, ...changes }));

  const reset = () => {
    setStep('upload');
    setFileName('');
    setParsed(null);
    setChoices(initialChoices);
  };

  const close = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    if (!open || step === 'options') return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  const running = run?.status === 'running';

  const handleFile = async (file) => {
    if (!file) return;

    setReading(true);
    const result = await readSessionsFile(file);
    setReading(false);
    setFileName(file.name);
    setParsed(result);

    console.log(`📄 Imported ${file.name}:`, result);
    console.table(result.sessions.map(({ extra, ...session }) => ({
      ...session,
      ...Object.fromEntries(extra.map(field => [field.label, field.value])),
    })));
    setChoices(initialChoices);

    if (!result.error && result.sessions.length > 0) {
      setStep('export');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const sessions = parsed?.sessions || [];
  const usesStatus = sessions.some(session => session.status);
  const completedSessions = sessions.filter(isCompleted);
  const sections = distinct(sessions.map(sectionLabel));

  const scopedSessions = choices.scope === 'completed'
    ? completedSessions
    : sessions.filter(session => choices.selectedIds.includes(session.session_id));
  const exportSessions = scopedSessions.filter(session => !choices.excludedSections.includes(sectionLabel(session)));

  const tooMany = exportSessions.length > MAX_BULK_SESSIONS;
  const canStart = exportSessions.length > 0 && !tooMany && !running;

  const buildOptions = () => {
    const base = choices.reportOptions || defaultReportOptions();

    return {
      ...base,
      display_scores: choices.itemScores,
      questions_api_init_options: {
        ...base.questions_api_init_options,
        showCorrectAnswers: choices.correctAnswers,
      },
    };
  };

  const startExport = async () => {
    const chosen = exportSessions;
    const { filesPerCandidate, addIndex } = choices;
    const options = buildOptions();

    setRun({ status: 'running', count: chosen.length });
    close();

    const requestSessions = chosen.map(session => ({
      session_id: session.session_id,
      user_id: session.user_id,
      first_name: session.first_name,
      last_name: session.last_name,
    }));

    const file = await onGenerate(requestSessions, options);
    if (!file) {
      setRun({ status: 'error', count: chosen.length });
      return;
    }

    try {
      const archive = await buildExportArchive(file.blob, chosen, { filesPerCandidate, addIndex });
      if (archive.zip) onSave(archive.zip, EXPORT_FILE_NAME);
      setRun({ status: 'done', count: chosen.length, completed: archive.completed, failed: archive.failed });
    } catch (error) {
      console.error('Could not build export:', error);
      setRun({ status: 'error', count: chosen.length, error: 'The reports were generated, but the ZIP could not be built.' });
    }
  };

  const renderNotice = () => {
    if (!run) return null;

    const failed = run.failed || [];

    return (
      <div role="status" style={styles.notice}>
        <div style={styles.titleRow}>
          <strong>
            {running && `Exporting ${plural(run.count, 'PDF')}...`}
            {run.status === 'done' && (run.completed > 0 ? 'Export ready' : 'Export failed')}
            {run.status === 'error' && 'Export failed'}
          </strong>
          {!running && (
            <button type="button" aria-label="Dismiss" onClick={() => setRun(null)} style={styles.closeButton}>×</button>
          )}
        </div>
        {running && <p style={{ margin: '6px 0 0' }}>Running in the background. Keep this page open.</p>}
        {run.status === 'error' && <p style={{ margin: '6px 0 0' }}>{run.error || job?.error || 'Please try again.'}</p>}
        {run.status === 'done' && (
          <p style={{ margin: '6px 0 8px' }}>
            {run.completed > 0
              ? `${EXPORT_FILE_NAME} has been downloaded with ${run.completed} of ${run.count} reports.`
              : `None of the ${plural(run.count, 'report')} could be generated.`}
          </p>
        )}
        {failed.length > 0 && failed.map(report => (
          <div key={report.session_id} style={styles.failedRow}>
            <strong>{report.user_id}</strong> {report.session_id}
            <div style={{ color: '#c00' }}>{report.message}</div>
          </div>
        ))}
      </div>
    );
  };

  const renderUpload = () => (
    <div style={styles.overlay} onClick={close}>
      <div role="dialog" aria-modal="true" aria-labelledby="bulk-upload-title" style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...styles.header, ...styles.titleRow }}>
          <h3 id="bulk-upload-title" style={{ margin: 0 }}>Import sessions</h3>
          <button type="button" aria-label="Close" onClick={close} style={styles.closeButton}>×</button>
        </div>
        <div style={styles.body}>
          {parsed?.error && <div role="alert" style={styles.alert}>{fileName}: {parsed.error}</div>}
          {parsed && !parsed.error && sessions.length === 0 && (
            <div role="alert" style={styles.alert}>
              {fileName}: no usable rows.
              {parsed.issues.slice(0, 5).map(issue => (
                <div key={issue.row}>Row {issue.row}: {issue.message}</div>
              ))}
            </div>
          )}
          <button
            type="button"
            style={{ ...styles.dropzone, ...(dragging ? styles.dropzoneActive : {}) }}
            onClick={() => fileInput.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <strong>{reading ? 'Reading file...' : 'Drop your .xlsx file here'}</strong>
            <span style={{ display: 'block', color: '#666', marginTop: '4px' }}>or click to choose a file</span>
          </button>
          <input
            ref={fileInput}
            type="file"
            aria-label="Sessions Excel file"
            accept=".xlsx"
            style={{ display: 'none' }}
            onChange={(e) => {
              handleFile(e.target.files[0]);
              e.target.value = '';
            }}
          />
          <p style={{ fontSize: '14px', color: '#666' }}>
            Required columns: <strong>session_id</strong>, <strong>activity_id</strong>, <strong>user_id</strong>.
            Optional: session_status, first_name, last_name, email, section_name, score.
          </p>
          <p style={{ fontSize: '14px' }}>
            <a href={TEMPLATE_PATH} download>Download the Excel template</a>
          </p>
        </div>
      </div>
    </div>
  );

  const renderScope = () => (
    <div style={styles.group}>
      <div style={styles.groupLabel}>SCOPE</div>
      <div style={styles.groupBody}>
        <label style={styles.choice}>
          <input
            type="radio"
            name="export-scope"
            checked={choices.scope === 'completed'}
            onChange={() => choose({ scope: 'completed' })}
          />
          <span>
            {usesStatus
              ? `All candidates with a completed session (${distinct(completedSessions.map(session => session.user_id)).length})`
              : `All candidates in the file (${distinct(sessions.map(session => session.user_id)).length})`}
          </span>
        </label>
        <label style={styles.choice}>
          <input
            type="radio"
            name="export-scope"
            checked={choices.scope === 'selection'}
            onChange={() => choose({ scope: 'selection' })}
          />
          <span>Current selection ({choices.selectedIds.length})</span>
        </label>

        {choices.scope === 'selection' && (
          <div style={styles.list}>
            {sections.map(section => {
              const sectionIds = sessions
                .filter(session => sectionLabel(session) === section)
                .map(session => session.session_id);
              const allSelected = sectionIds.every(sessionId => choices.selectedIds.includes(sessionId));

              return (
                <div key={section} style={{ marginBottom: '8px' }}>
                  <label style={{ ...styles.choice, fontWeight: 'bold' }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => choose({
                        selectedIds: e.target.checked
                          ? distinct([...choices.selectedIds, ...sectionIds])
                          : choices.selectedIds.filter(sessionId => !sectionIds.includes(sessionId)),
                      })}
                    />
                    <span>{section} ({sectionIds.length})</span>
                  </label>
                  {sessions.filter(session => sectionLabel(session) === section).map(session => (
                    <label key={session.session_id} style={{ ...styles.choice, marginLeft: '24px' }}>
                      <input
                        type="checkbox"
                        checked={choices.selectedIds.includes(session.session_id)}
                        onChange={(e) => choose({
                          selectedIds: e.target.checked
                            ? [...choices.selectedIds, session.session_id]
                            : choices.selectedIds.filter(sessionId => sessionId !== session.session_id),
                        })}
                      />
                      <span>{candidateName(session)}{session.status ? ` · ${session.status}` : ''}</span>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        <div style={styles.sections}>
          <span style={styles.sectionsLabel}>Sections</span>
          {sections.map(section => (
            <label key={section} style={{ ...styles.choice, marginBottom: 0 }}>
              <input
                type="checkbox"
                checked={!choices.excludedSections.includes(section)}
                onChange={(e) => choose({
                  excludedSections: e.target.checked
                    ? choices.excludedSections.filter(name => name !== section)
                    : [...choices.excludedSections, section],
                })}
              />
              <span>{section}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContent = () => (
    <div style={styles.group}>
      <div style={styles.groupLabel}>CONTENT</div>
      <div style={styles.groupBody}>
        <label style={styles.choice}>
          <input type="checkbox" checked={choices.correctAnswers} onChange={(e) => choose({ correctAnswers: e.target.checked })} />
          <span>Correct answers</span>
        </label>
        <label style={styles.choice}>
          <input type="checkbox" checked={choices.itemScores} onChange={(e) => choose({ itemScores: e.target.checked })} />
          <span>Item scores</span>
        </label>
        <button type="button" onClick={() => setStep('options')} style={styles.linkButton}>
          More report options
        </button>
      </div>
    </div>
  );

  const renderFiles = () => (
    <div style={styles.group}>
      <div style={styles.groupLabel}>FILES</div>
      <div style={styles.groupBody}>
        <label style={styles.choice}>
          <input
            type="radio"
            name="export-files"
            checked={!choices.filesPerCandidate}
            onChange={() => choose({ filesPerCandidate: false })}
          />
          <span>One PDF per session (candidate × section)</span>
        </label>
        <label style={styles.choice}>
          <input
            type="radio"
            name="export-files"
            checked={choices.filesPerCandidate}
            onChange={() => choose({ filesPerCandidate: true })}
          />
          <span>One PDF per candidate (sections merged)</span>
        </label>
        <label style={styles.choice}>
          <input type="checkbox" checked={choices.addIndex} onChange={(e) => choose({ addIndex: e.target.checked })} />
          <span>Add index.csv (candidate, e-mail, section, score, file)</span>
        </label>
      </div>
    </div>
  );

  const renderExport = () => {
    const candidateCount = distinct(sessions.map(session => session.user_id)).length;
    const summary = usesStatus
      ? plural(completedSessions.length, 'completed session')
      : plural(sessions.length, 'session');

    return (
      <div style={styles.overlay} onClick={close}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-title"
          className="export-modal"
          style={styles.exportDialog}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={styles.exportHeader}>
            <div style={styles.titleRow}>
              <h2 id="export-title" style={styles.exportTitle}>Export answer sheets</h2>
              <button type="button" aria-label="Close" onClick={close} style={styles.closeButton}>×</button>
            </div>
            <p style={styles.subtitle}>
              {fileName.replace(/\.xlsx$/i, '')} · {plural(candidateCount, 'candidate')} · {summary}
            </p>
          </div>

          <div style={styles.exportBody}>
            {parsed.issues.length > 0 && (
              <details style={styles.skipped}>
                <summary style={{ cursor: 'pointer' }}>{plural(parsed.issues.length, 'row')} skipped</summary>
                {parsed.issues.map(issue => (
                  <div key={issue.row} style={{ marginTop: '4px' }}>Row {issue.row}: {issue.message}</div>
                ))}
              </details>
            )}
            {renderScope()}
            {renderContent()}
            {renderFiles()}
            {tooMany && (
              <div role="alert" style={styles.alert}>
                {exportSessions.length} sessions selected. The limit is {MAX_BULK_SESSIONS} per export, so please narrow the scope.
              </div>
            )}
            {running && <div role="alert" style={styles.alert}>An export is already running. Please wait for it to finish.</div>}
          </div>

          <div style={styles.footerRow}>
            <span style={styles.footerNote}>
              Exports {plural(exportSessions.length, 'session')}. Runs in the background and you will be notified here.
            </span>
            <button type="button" onClick={close} style={styles.cancelButton}>Cancel</button>
            <button type="button" disabled={!canStart} onClick={startExport} style={startButtonStyle(!canStart)}>
              Start export
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        .export-modal input[type="checkbox"],
        .export-modal input[type="radio"] {
          accent-color: #2457d6;
          width: 16px;
          height: 16px;
          margin-top: 2px;
          flex-shrink: 0;
        }
      `}</style>
      {open && step === 'upload' && renderUpload()}
      {open && step === 'export' && renderExport()}
      <ReportOptionsModal
        open={open && step === 'options'}
        title="More report options"
        note="These options apply to every report in this export."
        submitLabel="Apply"
        onClose={() => setStep('export')}
        onGenerate={(reportOptions) => {
          choose({
            reportOptions,
            itemScores: reportOptions.display_scores,
            correctAnswers: reportOptions.questions_api_init_options.showCorrectAnswers,
          });
          setStep('export');
        }}
      />
      {renderNotice()}
    </>
  );
};

export default BulkReportModal;
