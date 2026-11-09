import React, { useState, useEffect } from 'react';

// Mirrors the reports sidebar of the Learnosity Paper demo.
// https://labs.learnosity.com/demos/api-paper/index.php#/reports

const ASSESSMENT_FIELDS = [
  { value: 'participant_name', label: 'Participant username' },
  { value: 'date_started', label: 'Date / Time started' },
  { value: 'date_ended', label: 'Date / Time ended' },
  { value: 'time_taken', label: 'Time taken' },
  { value: 'num_questions_answered', label: 'Number of questions answered' },
  { value: 'total_score', label: 'Total score' },
  { value: 'max_score', label: 'Maximum score' },
  { value: 'status', label: 'Status' },
  { value: 'assessment_time_limit', label: 'Assessment time limit' },
];

const DEFAULT_SETTINGS = {
  removeColumns: true,
  showPageNumbers: true,
  fontSize: 'normal',
  paperFormat: 'A4',
  paperMargin: 'normal',
  enableBanner: false,
  participantIdentity: 'username',
  showAssessmentScore: true,
  scoreDisplayAs: 'raw',
  coverEnabled: false,
  coverContent: '',
  coverBreakAfter: false,
  allAssessmentData: false,
  assessmentFields: ['participant_name', 'date_started', 'date_ended', 'time_taken', 'total_score', 'max_score', 'status'],
  displayScores: true,
  showDistractorRationale: false,
  showInstructorStimulus: false,
  scoringGroupEnabled: false,
  scoringGroupActivityScores: true,
  scoringGroupOverallScore: true,
  scoringGroupTable: true,
  questionSource: 'raw',
  includeUnmarked: true,
  includeMarked: true,
  includeNotAttempted: true,
  includeAttempted: true,
  includeIncorrect: true,
  includeCorrect: true,
  showCorrectAnswers: true,
};

export const buildReportOptions = (settings) => ({
  questions_api_init_options: {
    show_distractor_rationale: settings.showDistractorRationale,
    showCorrectAnswers: settings.showCorrectAnswers,
    showInstructorStimulus: settings.showInstructorStimulus,
    question_source: settings.questionSource,
  },
  assessment_fields: settings.allAssessmentData
    ? ASSESSMENT_FIELDS.map(field => field.value)
    : ASSESSMENT_FIELDS.map(field => field.value).filter(value => settings.assessmentFields.includes(value)),
  remove_columns: settings.removeColumns,
  show_page_numbers: settings.showPageNumbers,
  font_size: settings.fontSize,
  paper: {
    format: settings.paperFormat,
    margin: settings.paperMargin,
  },
  enable_banner: settings.enableBanner,
  participant_identity: settings.participantIdentity,
  show_assessment_score: settings.showAssessmentScore,
  score_display_as: settings.scoreDisplayAs,
  include_unmarked: settings.includeUnmarked,
  include_not_attempted: settings.includeNotAttempted,
  include_incorrect: settings.includeIncorrect,
  include_correct: settings.includeCorrect,
  display_scores: settings.displayScores,
  cover_page: settings.coverEnabled && settings.coverContent.trim()
    ? {
      enabled: true,
      content: settings.coverContent,
      break_after_cover_page: settings.coverBreakAfter,
    }
    : undefined,
  scoring_group_reportlet: settings.scoringGroupEnabled
    ? {
      enabled: true,
      show_activity_level_scores: settings.scoringGroupActivityScores,
      show_overall_score: settings.scoringGroupOverallScore,
      show_table: settings.scoringGroupTable,
    }
    : undefined,
});

export const defaultReportOptions = () => buildReportOptions(DEFAULT_SETTINGS);

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 10000,
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '560px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
    color: '#333',
  },
  header: { padding: '16px 20px', borderBottom: '1px solid #dee2e6' },
  body: { padding: '8px 20px', overflowY: 'auto', flex: 1 },
  footer: {
    padding: '12px 20px',
    borderTop: '1px solid #dee2e6',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
  },
  section: { borderBottom: '1px solid #eee', padding: '10px 0' },
  summary: { fontWeight: 'bold', cursor: 'pointer', padding: '4px 0' },
  sectionBody: { paddingTop: '8px' },
  row: { marginBottom: '10px' },
  label: { display: 'block', fontWeight: 'bold', marginBottom: '4px', fontSize: '14px' },
  checkLabel: { display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px' },
  hint: { display: 'block', color: '#666', fontSize: '12px', margin: '2px 0 0 21px' },
  control: { width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' },
  error: { color: '#c00', fontSize: '12px', padding: '0 20px 8px' },
};

export const buttonStyle = (backgroundColor, disabled) => ({
  backgroundColor,
  color: 'white',
  padding: '8px 16px',
  border: 'none',
  borderRadius: '4px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.6 : 1,
});

export { styles as modalStyles };

const Check = ({ id, label, hint, checked, disabled, indent = 0, onChange }) => (
  <div style={{ ...styles.row, marginLeft: `${indent * 20}px`, opacity: disabled ? 0.5 : 1 }}>
    <label htmlFor={id} style={styles.checkLabel}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: '3px' }}
      />
      <span>{label}</span>
    </label>
    {hint && <small style={styles.hint}>{hint}</small>}
  </div>
);

const Select = ({ id, label, value, options, disabled, onChange }) => (
  <div style={styles.row}>
    <label htmlFor={id} style={styles.label}>{label}</label>
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      style={styles.control}
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </div>
);

const Section = ({ title, open, children }) => (
  <details open={open} style={styles.section}>
    <summary style={styles.summary}>{title}</summary>
    <div style={styles.sectionBody}>{children}</div>
  </details>
);

const ReportOptionsModal = ({ open, job, title = 'Report options', note, submitLabel = 'Generate report', onClose, onGenerate }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const update = (changes) => setSettings(prev => ({ ...prev, ...changes }));
  const bind = (key) => ({ checked: settings[key], onChange: (value) => update({ [key]: value }) });

  const busy = job?.status === 'generating' || job?.status === 'downloading';

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const toggleAssessmentField = (value, checked) => update({
    assessmentFields: checked
      ? [...settings.assessmentFields, value]
      : settings.assessmentFields.filter(field => field !== value),
  });

  const buttonLabels = {
    generating: 'Generating PDF...',
    downloading: 'Downloading PDF...',
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-options-title"
        style={styles.dialog}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.header}>
          <h3 id="report-options-title" style={{ margin: 0 }}>{title}</h3>
          {note && <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#666' }}>{note}</p>}
        </div>

        <div style={styles.body}>
          <Section title="PDF Settings" open>
            <Check
              id="remove-columns"
              label="Remove columns"
              hint="Convert 2-column layouts to single column for printing"
              {...bind('removeColumns')}
            />
            <Check
              id="show-page-numbers"
              label="Show page numbers"
              hint="Add page numbers in footer of each PDF page"
              {...bind('showPageNumbers')}
            />
            <Select
              id="font-size"
              label="Font size"
              value={settings.fontSize}
              onChange={(fontSize) => update({ fontSize })}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'large', label: 'Large' },
                { value: 'xlarge', label: 'Extra large' },
              ]}
            />
            <Select
              id="paper-format"
              label="Paper format"
              value={settings.paperFormat}
              onChange={(paperFormat) => update({ paperFormat })}
              options={[
                { value: 'A4', label: 'A4 (210 × 297 mm)' },
                { value: 'Letter', label: 'Letter (8.5 × 11 in)' },
                { value: 'Legal', label: 'Legal (8.5 × 14 in)' },
                { value: 'JIS-B5', label: 'JIS B5 (182 × 257 mm)' },
              ]}
            />
            <Select
              id="paper-margin"
              label="Margins"
              value={settings.paperMargin}
              onChange={(paperMargin) => update({ paperMargin })}
              options={[
                { value: 'minimal', label: 'Minimal (10mm)' },
                { value: 'narrow', label: 'Narrow (15mm)' },
                { value: 'normal', label: 'Normal (20mm)' },
              ]}
            />
          </Section>

          <Section title="Report banner">
            <Check id="enable-banner" label="Enable banner" {...bind('enableBanner')} />
            <Select
              id="participant-identity"
              label="Participant identity"
              value={settings.participantIdentity}
              onChange={(participantIdentity) => update({ participantIdentity })}
              options={[
                { value: 'username', label: 'Participant username' },
                { value: 'name', label: 'First & Last name' },
              ]}
            />
            <Check id="show-assessment-score" label="Assessment score" {...bind('showAssessmentScore')} />
            <Select
              id="score-display-as"
              label="Display as"
              value={settings.scoreDisplayAs}
              disabled={!settings.showAssessmentScore}
              onChange={(scoreDisplayAs) => update({ scoreDisplayAs })}
              options={[
                { value: 'raw', label: 'Raw score' },
                { value: 'percentage', label: 'Percentage score' },
              ]}
            />
          </Section>

          <Section title="Report settings">
            <Check id="cover-enabled" label="Include custom cover page" {...bind('coverEnabled')} />
            {settings.coverEnabled && (
              <div style={{ ...styles.row, marginLeft: '20px' }}>
                <label htmlFor="cover-content" style={styles.label}>Cover page content (HTML)</label>
                <textarea
                  id="cover-content"
                  rows="4"
                  value={settings.coverContent}
                  onChange={(e) => update({ coverContent: e.target.value })}
                  style={styles.control}
                />
                <div style={{ marginTop: '8px' }}>
                  <Check id="cover-break" label="Start questions on a new page" {...bind('coverBreakAfter')} />
                </div>
              </div>
            )}

            <Check
              id="all-assessment-data"
              label="All available data"
              hint="Include a details table at the top of the PDF"
              {...bind('allAssessmentData')}
            />
            {ASSESSMENT_FIELDS.map(field => (
              <Check
                key={field.value}
                id={`assessment-field-${field.value}`}
                label={field.label}
                indent={1}
                checked={settings.allAssessmentData || settings.assessmentFields.includes(field.value)}
                disabled={settings.allAssessmentData}
                onChange={(checked) => toggleAssessmentField(field.value, checked)}
              />
            ))}

            <Check
              id="show-item-score"
              label="Show item score"
              hint="Show the item scores next to each item in the report."
              {...bind('displayScores')}
            />
            <Check id="show-distractor-rationale" label="Show distractor rationale" {...bind('showDistractorRationale')} />
            <Check id="show-instructor-stimulus" label="Show instructor stimulus" {...bind('showInstructorStimulus')} />
            <Check id="show-scoring-group" label="Show scoring group reportlet" {...bind('scoringGroupEnabled')} />
            {settings.scoringGroupEnabled && (
              <>
                <Check id="scoring-activity-scores" label="Show activity level scores" indent={1} {...bind('scoringGroupActivityScores')} />
                <Check id="scoring-overall-score" label="Show overall score" indent={1} {...bind('scoringGroupOverallScore')} />
                <Check id="scoring-table" label="Show summary table" indent={1} {...bind('scoringGroupTable')} />
              </>
            )}
            <Select
              id="question-source"
              label="Question source"
              value={settings.questionSource}
              onChange={(questionSource) => update({ questionSource })}
              options={[
                { value: 'original', label: 'Original' },
                { value: 'scorable', label: 'Scorable' },
                { value: 'raw', label: 'Raw' },
              ]}
            />
          </Section>

          <Section title="Question settings">
            <Check id="include-unmarked" label="Unmarked (not scored)" {...bind('includeUnmarked')} />
            <Check
              id="include-marked"
              label="Marked (scored)"
              checked={settings.includeMarked}
              onChange={(checked) => update({
                includeMarked: checked,
                includeNotAttempted: checked,
                includeAttempted: checked,
                includeIncorrect: checked,
                includeCorrect: checked,
              })}
            />
            <Check
              id="include-not-attempted"
              label="Not attempted questions"
              indent={1}
              disabled={!settings.includeMarked}
              {...bind('includeNotAttempted')}
            />
            <Check
              id="include-attempted"
              label="Attempted questions"
              indent={1}
              disabled={!settings.includeMarked}
              checked={settings.includeAttempted}
              onChange={(checked) => update({
                includeAttempted: checked,
                includeIncorrect: checked,
                includeCorrect: checked,
              })}
            />
            <Check
              id="include-incorrect"
              label="Incorrect answers"
              indent={2}
              disabled={!settings.includeMarked || !settings.includeAttempted}
              {...bind('includeIncorrect')}
            />
            <Check
              id="include-correct"
              label="Correct answers"
              indent={2}
              disabled={!settings.includeMarked || !settings.includeAttempted}
              {...bind('includeCorrect')}
            />
            <Check
              id="show-correct-answers"
              label="Show correct answer for incorrect responses"
              hint="Display what the correct answer should have been alongside incorrect responses"
              {...bind('showCorrectAnswers')}
            />
          </Section>
        </div>

        {job?.error && <div role="alert" style={styles.error}>{job.error}</div>}

        <div style={styles.footer}>
          <button type="button" onClick={onClose} style={buttonStyle('#6c757d', false)}>
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onGenerate(buildReportOptions(settings))}
            style={buttonStyle('#17a2b8', busy)}
          >
            {buttonLabels[job?.status] || submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportOptionsModal;
