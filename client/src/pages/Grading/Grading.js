import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Home from '../Home';
import { ExternalScript } from '../../utils/ExternalScript';
import ReportOptionsModal from './ReportOptionsModal';
import BulkReportModal from './BulkReportModal';

const Grading = () => {
  const { activity_id } = useParams();
  
  const [formData, setFormData] = useState({
    session_id: 'a9cc4017-2786-4dd8-a82a-6b917329a834',
    student_id: '744717',
    activity_id: activity_id || '7257f5ee-270c-4744-a517-691c021febbc',
    activity_template_id: 'Manual Grading collection',
    items: 'Stimulus,7bc49ad1-2b4c-4a0f-bf1e-47efe8b7a9f4,7bc49ad1-2b4c-4a0f-bf1e-47efe8b7a9f4,7bc49ad1-2b4c-4a0f-bf1e-47efe8b7a9f4,7bc49ad1-2b4c-4a0f-bf1e-47efe8b7a9f4,7bc49ad1-2b4c-4a0f-bf1e-47efe8b7a9f4',
    grader_id: '744717'
  });

  const [currentStep, setCurrentStep] = useState('form');
  const [apiConfig, setApiConfig] = useState(null);
  const [error, setError] = useState(null);
  const [gradingApp, setGradingApp] = useState(null);
  const [attachedItems, setAttachedItems] = useState([]);
  const [pdfJobs, setPdfJobs] = useState({});
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  const PDF_POLL_INTERVAL_MS = 3000;
  const PDF_POLL_TIMEOUT_MS = 3 * 60 * 1000;
  const PDF_BULK_POLL_TIMEOUT_MS = 45 * 60 * 1000;

  const EVENT_NAMES = {
      saveStart: 'save:start',
      saveComplete: 'save:complete',
      saveError: 'save:error',
      saveFieldError: 'save:fields:error',
      attachItemStart: 'attachitem:start',
      attachItemComplete: 'attachitem:complete',
      attachItemError: 'attachitem:error',
      detachItemStart: 'detachitem:start',
      detachItemComplete: 'detachitem:complete',
      detachItemError: 'detachitem:error',
      resetStart: 'reset:start',
      resetComplete: 'reset:complete',
      resetError: 'reset:error',
      error: 'error',
      ready: 'ready',
  };

  const GradingAPI = {
    async initApi(config) {
      try {
        const app = await window.LearnosityGrading.init(config);
        
        Object.keys(EVENT_NAMES).forEach(eventKey => {
          app.on(EVENT_NAMES[eventKey], (data) => {
            console.log(`📌 Grading API Event: ${eventKey}`, data);
            
            if (eventKey === 'saveComplete') {
              handleSaveComplete(data);
            } else if (eventKey === 'saveError' || eventKey === 'saveFieldError') {
              handleSaveError(data);
            }
          });
        });

        return app;
      } catch (error) {
        throw new Error(`Failed to initialize Learnosity Grading: ${error.message}`);
      }
    },

    async attachItem(app, sessionId, userId, itemRef, wrapper) {
      const hookElement = document.createElement('div');
      hookElement.setAttribute('session-id', sessionId);
      hookElement.setAttribute('user-id', userId);
      hookElement.setAttribute('item-reference', itemRef);
      hookElement.className = 'lrn-mg-item-hook';
      
      wrapper.appendChild(hookElement);

      const payload = {
        sessionId,
        userId,
        item: itemRef
      };
      console.log('payload',payload);
      return app.attachItem(payload, hookElement);
    },

    async save(app) {
      return app.save();
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const loadGradingConfig = async (e) => {
    e.preventDefault();
    
    if (!formData.session_id || !formData.student_id) {
      setError('Session ID and Student ID are required');
      return;
    }

    setCurrentStep('loading');
    setError(null);

    try {
      const response = await fetch('/grading-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const config = await response.json();
      
      if (!config || !config.request) {
        throw new Error('Invalid response format from server');
      }

      setApiConfig(config);
      await loadLearnosityScript();
      
    } catch (error) {
      console.error('Error loading grading config:', error);
      setError(error.message);
      setCurrentStep('error');
    }
  };

  const loadLearnosityScript = async () => {
    try {
      await ExternalScript('//grading.learnosity.com/?v2023.1.LTS');
      setCurrentStep('grading');
    } catch (error) {
      console.error('Failed to load Learnosity script:', error);
      setError('Failed to load grading script');
      setCurrentStep('error');
    }
  };

  useEffect(() => {
    if (currentStep === 'grading' && apiConfig && window.LearnosityGrading) {
      initializeGradingApp();
    }
  }, [currentStep, apiConfig]);

  const initializeGradingApp = async () => {
    try {
      let container = document.getElementById('manual-grading');
      if (!container) {
        container = document.createElement('div');
        container.id = 'manual-grading';
        document.body.appendChild(container);
      }

      const app = await GradingAPI.initApi(apiConfig.request);
      setGradingApp(app);

      await attachItems(app);
      
    } catch (error) {
      console.error('Error initializing grading app:', error);
      setError(`Failed to initialize grading: ${error.message}`);
      setCurrentStep('error');
    }
  };

  const attachItems = async (app) => {
    const wrapper = document.getElementById('inline-items-wrapper');
    if (!wrapper) {
      throw new Error('Items wrapper not found');
    }

    const itemList = formData.items.split(',').map(item => item.trim()).filter(item => item.length > 0);
    const { session_id, student_id } = formData;
    
    let successfulAttachments = 0;
    const attachmentResults = [];

    for (const itemRef of itemList) {
      try {
        console.log(`Attaching item: ${itemRef}`);
        const result = await GradingAPI.attachItem(app, session_id, student_id, itemRef, wrapper);
        
        setupItemLayout(result, itemRef, successfulAttachments + 1);
        
        attachmentResults.push({ itemRef, success: true, result });
        successfulAttachments++;
        
      } catch (error) {
        console.error(`Failed to attach item ${itemRef}:`, error);
        attachmentResults.push({ itemRef, success: false, error: error.message });
      }
    }

    setAttachedItems(attachmentResults);
    
    if (successfulAttachments === 0) {
      throw new Error('No items were successfully attached. Please check your session ID, student ID, and item references.');
    }

    enableSubmitButton(app);
  };

  const setupItemLayout = (attachedItems, itemRef, itemNumber) => {
    const itemElement = findItemElement(attachedItems, itemRef);
    
    if (itemElement) {
      const header = document.createElement('div');
      header.innerHTML = `<h3 class="lrn-report-item-title">Item ${itemNumber}</h3>`;
      
      const dataRef = itemElement.querySelector(`[data-reference="${itemRef}"]`);
      if (dataRef) {
        itemElement.insertBefore(header, dataRef);
        
        const hr = document.createElement('div');
        hr.className = 'hr-border';
        hr.style.cssText = 'border-top: 1px solid #ccc; margin: 20px 0;';
        dataRef.appendChild(hr);
      }

      const mgScoreFeedbackElements = itemElement.querySelectorAll(`[data-lrn-widget-type='mg-score-feedback']`);
      const questionElements = itemElement.querySelectorAll(`[data-lrn-widget-type='question']`);

      mgScoreFeedbackElements.forEach((element) => {
        element.style.cssText = 'width: 40%; float: right; padding-left: 20px;';
      });
      
      questionElements.forEach((element) => {
        element.style.cssText = 'width: 60%; float: left;';
      });
    }
  };

  const findItemElement = (attachedItems, itemRef) => {
    if (Array.isArray(attachedItems)) {
      for (const session of attachedItems) {
        if (session.items) {
          const item = session.items.find(i => i.reference === itemRef);
          if (item && item.element) {
            return item.element;
          }
        }
      }
    }
    return null;
  };

  const enableSubmitButton = (app) => {
    const submitButton = document.querySelector('.mg-grading-next-btn');
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.addEventListener('click', () => handleSubmit(app));
    }
  };

  const handleSubmit = async (app) => {
    const submitButton = document.querySelector('.mg-grading-next-btn');
    const spinner = document.querySelector('.btn-spinner');

    if (submitButton) submitButton.disabled = true;
    if (spinner) spinner.style.display = 'inline-block';

    try {
      const savedItems = await GradingAPI.save(app);
      console.log('Save result:', savedItems);
      
      const hasUpdatedScores = savedItems?.some(item => 
        item?.updated_scores?.length > 0
      );

      if (hasUpdatedScores) {
        setCurrentStep('complete');
      } else {
        console.warn('No scores were updated during save');
        if (submitButton) submitButton.disabled = false;
        if (spinner) spinner.style.display = 'none';
      }
      
    } catch (error) {
      console.error('Save error:', error);
      setError(`Failed to save grading: ${error.message}`);
      if (submitButton) submitButton.disabled = false;
      if (spinner) spinner.style.display = 'none';
    }
  };

  const handleSaveComplete = (data) => {
    console.log('Save completed:', data);
  };

  const handleSaveError = (data) => {
    console.error('Save error:', data);
    setError(`Save failed: ${data.message || 'Unknown error'}`);
  };

  const postJson = (url, body) => fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const readError = async (response) => {
    const text = await response.text();
    try {
      return JSON.parse(text).error || text;
    } catch (e) {
      return text;
    }
  };

  const waitForPdfJob = async (statusPath, userId, timeoutMs) => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const response = await postJson(statusPath, { user_id: userId });
      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status} - ${await readError(response)}`);
      }

      const job = await response.json();
      console.log('📄 PDF job status:', job);

      if (job.status === 'complete') return job;
      if (job.status === 'error') throw new Error(job.error || 'PDF generation failed');

      await new Promise(resolve => setTimeout(resolve, PDF_POLL_INTERVAL_MS));
    }

    throw new Error('Timed out waiting for the PDF to be generated');
  };

  const saveBlob = (blob, contentDisposition, fallbackName) => {
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisposition || '');
    const fileName = match ? decodeURIComponent(match[1]) : fallbackName;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const getItemList = () => [
    ...new Set(formData.items.split(',').map(item => item.trim()).filter(item => item.length > 0))
  ];

  const reportJobPath = (jobId) => ({
    status: `/report-pdf/status/${jobId}`,
    download: `/report-pdf/download/${jobId}`,
  });

  const PDF_DOCUMENTS = [
    {
      key: 'report',
      label: 'Download PDF Report',
      hasOptions: true,
      createPath: '/report-pdf',
      jobPath: reportJobPath,
      createBody: (userId, options) => ({
        session_id: formData.session_id,
        user_id: formData.student_id,
        grader_id: formData.grader_id,
        options,
      }),
      fileName: () => `${formData.student_id}-${formData.session_id}.pdf`,
    },
    {
      key: 'answerKeys',
      label: 'Download Answer Keys',
      createPath: '/paper-documents/answer-keys',
      createBody: (userId) => ({ user_id: userId, items: getItemList() }),
      fileName: () => `answer-keys-${formData.session_id}.pdf`,
    },
    {
      key: 'contentReview',
      label: 'Download Content Review',
      createPath: '/paper-documents/content-review',
      createBody: (userId) => ({ user_id: userId, items: getItemList() }),
      fileName: () => `content-review-${formData.session_id}.pdf`,
    },
    {
      key: 'paperDocument',
      label: 'Download Printable Paper',
      createPath: '/paper-documents/paper',
      createBody: (userId) => ({
        user_id: userId,
        items: getItemList(),
        name: `Paper - ${formData.activity_id}`,
      }),
      fileName: () => `paper-${formData.activity_id}.pdf`,
    },
  ];

  const BULK_REPORT_DOCUMENT = {
    key: 'bulkReport',
    createPath: '/report-pdf/bulk',
    jobPath: reportJobPath,
    createBody: (userId, { sessions, options }) => ({ sessions, options, grader_id: formData.grader_id }),
    fileName: () => 'answer-sheets.zip',
    pollTimeoutMs: PDF_BULK_POLL_TIMEOUT_MS,
    saveFile: false,
  };

  const defaultJobPath = (jobId) => ({
    status: `/paper-documents/${jobId}/status`,
    download: `/paper-documents/${jobId}/download`,
  });

  const downloadPdfDocument = async (pdfDocument, options) => {
    const { key, createPath, createBody, fileName, jobPath = defaultJobPath, pollTimeoutMs = PDF_POLL_TIMEOUT_MS } = pdfDocument;
    const userId = formData.grader_id || formData.student_id || options?.sessions?.[0]?.user_id;
    const setJob = (job) => setPdfJobs(prev => ({ ...prev, [key]: job }));

    setJob({ status: 'generating' });

    try {
      const createResponse = await postJson(createPath, createBody(userId, options));
      if (!createResponse.ok) {
        throw new Error(`Failed to start PDF generation: ${createResponse.status} - ${await readError(createResponse)}`);
      }

      const job = await createResponse.json();
      const paths = jobPath(encodeURIComponent(job.job_id));
      if (job.status !== 'complete') {
        await waitForPdfJob(paths.status, userId, pollTimeoutMs);
      }

      setJob({ status: 'downloading' });
      const downloadResponse = await postJson(paths.download, { user_id: userId });
      if (!downloadResponse.ok) {
        throw new Error(`Download failed: ${downloadResponse.status} - ${await readError(downloadResponse)}`);
      }

      const blob = await downloadResponse.blob();
      if (pdfDocument.saveFile !== false) {
        saveBlob(blob, downloadResponse.headers.get('Content-Disposition'), fileName());
      }
      setJob({ status: 'idle' });
      return { blob };
    } catch (error) {
      console.error(`${key} PDF error:`, error);
      setJob({ status: 'error', error: error.message });
      return false;
    }
  };

  const generateReport = async (options) => {
    const reportDocument = PDF_DOCUMENTS.find(pdfDocument => pdfDocument.key === 'report');
    if (await downloadPdfDocument(reportDocument, options)) {
      setReportModalOpen(false);
    }
  };

  const generateBulkReports = (sessions, options) => downloadPdfDocument(BULK_REPORT_DOCUMENT, { sessions, options });

  const openBulkModal = () => {
    setPdfJobs(prev => ({ ...prev, [BULK_REPORT_DOCUMENT.key]: undefined }));
    setBulkModalOpen(true);
  };

  const renderBulkButton = () => (
    <button
      type="button"
      onClick={openBulkModal}
      style={{
        backgroundColor: 'white',
        color: '#117a8b',
        padding: '8px 16px',
        border: '1px solid #17a2b8',
        borderRadius: '4px',
        cursor: 'pointer',
        marginLeft: '10px',
        verticalAlign: 'top'
      }}
    >
      Bulk Import Sessions
    </button>
  );

  const renderPdfButton = (pdfDocument) => {
    const job = pdfJobs[pdfDocument.key] || { status: 'idle' };
    const busy = job.status === 'generating' || job.status === 'downloading';
    const labels = {
      generating: 'Generating PDF...',
      downloading: 'Downloading PDF...',
    };

    return (
      <div key={pdfDocument.key} style={{ display: 'inline-block', marginLeft: '10px', verticalAlign: 'top' }}>
        <button
          type="button"
          onClick={() => (pdfDocument.hasOptions ? setReportModalOpen(true) : downloadPdfDocument(pdfDocument))}
          disabled={busy}
          style={{
            backgroundColor: '#17a2b8',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.6 : 1
          }}
        >
          {labels[job.status] || `⬇ ${pdfDocument.label}`}
        </button>
        {job.error && (
          <div style={{ color: '#c00', fontSize: '12px', marginTop: '5px' }}>{job.error}</div>
        )}
      </div>
    );
  };

  const renderPdfButtons = () => PDF_DOCUMENTS.map(renderPdfButton);

  const resetToForm = () => {
    setCurrentStep('form');
    setError(null);
    setApiConfig(null);
    setGradingApp(null);
    setAttachedItems([]);
    setPdfJobs({});
    setReportModalOpen(false);
  };

  const renderForm = () => (
    <div className="grading-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div className="grading-form" style={{ backgroundColor: '#f9f9f9', padding: '30px', borderRadius: '8px' }}>
        <h2>Manual Grading - Load Assessment for Review</h2>
        <p>Enter the session and student details to load the assessment for grading.</p>
        
        <form onSubmit={loadGradingConfig}>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="session_id" style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              Session ID: *
            </label>
            <input
              type="text"
              id="session_id"
              name="session_id"
              value={formData.session_id}
              onChange={handleInputChange}
              placeholder="Enter the assessment session ID"
              required
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="activity_id" style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              Activity ID: *
            </label>
            <input
              type="text"
              id="activity_id"
              name="activity_id"
              value={formData.activity_id}
              onChange={handleInputChange}
              placeholder="Enter the activity ID"
              required
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
          
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="student_id" style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              Student ID: *
            </label>
            <input
              type="text"
              id="student_id"
              name="student_id"
              value={formData.student_id}
              onChange={handleInputChange}
              placeholder="Enter the student ID who took the assessment"
              required
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
          
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="grader_id" style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              Grader ID (optional):
            </label>
            <input
              type="text"
              id="grader_id"
              name="grader_id"
              value={formData.grader_id}
              onChange={handleInputChange}
              placeholder="Enter your grader ID"
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
          
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="items" style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              Items to Grade (comma separated):
            </label>
            <textarea
              id="items"
              name="items"
              value={formData.items}
              onChange={handleInputChange}
              placeholder="Enter items to be graded, separated by commas"
              rows="3"
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
          
          {error && (
            <div className="error-message" style={{ 
              backgroundColor: '#fee', 
              border: '1px solid #fcc', 
              padding: '15px', 
              borderRadius: '4px', 
              marginBottom: '20px',
              color: '#c00'
            }}>
              <h4>Error Details:</h4>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>{error}</pre>
              <p><strong>Troubleshooting Tips:</strong></p>
              <ul>
                <li>Verify the Session ID exists and is valid</li>
                <li>Ensure the Student ID has taken this specific assessment</li>
                <li>Check that item references match exactly</li>
                <li>Confirm the session has been completed by the student</li>
              </ul>
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={currentStep === 'loading'}
            style={{
              backgroundColor: '#007cba',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: currentStep === 'loading' ? 'not-allowed' : 'pointer',
              opacity: currentStep === 'loading' ? 0.6 : 1
            }}
          >
            {currentStep === 'loading' ? 'Loading...' : 'Load Grading Interface'}
          </button>
          {renderBulkButton()}
        </form>
      </div>
    </div>
  );

  const renderLoading = () => (
    <div className="grading-container" style={{ textAlign: 'center', padding: '50px' }}>
      <div className="loading-spinner">
        <h3>Loading Grading Interface...</h3>
        <p>Please wait while we prepare the grading tools for session: {formData.session_id}</p>
        <div style={{ 
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 2s linear infinite',
          margin: '20px auto'
        }}></div>
      </div>
    </div>
  );

  const renderGrading = () => (
    <div className="grading-container">
      <div className="grading-header" style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '20px', 
        borderBottom: '1px solid #dee2e6',
        marginBottom: '20px'
      }}>
        <h2>Teacher Scoring – Manual Grading</h2>
        <p>Session ID: {formData.session_id} | Student ID: {formData.student_id}</p>
        <p>Review and score the student's responses below.</p>
        <button 
          onClick={resetToForm}
          style={{
            backgroundColor: '#6c757d',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ← Back to Form
        </button>
        {renderPdfButtons()}
        {renderBulkButton()}
      </div>

      <div className="grading-interface">
        <div id="manual-grading" style={{ display: 'block' }}>
          <div id="inline-items-wrapper"></div>
        </div>
        
        <div className="submit-btn-group" style={{ 
          textAlign: 'center', 
          marginTop: '30px',
          padding: '20px',
          borderTop: '1px solid #dee2e6'
        }}>
          <button 
            type="button" 
            className="mg-grading-next-btn" 
            disabled
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: 'pointer',
              opacity: 0.6
            }}
          >
            <span className="btn-label">Save and Submit to Learner</span>
            <span className="btn-spinner" style={{ display: 'none', marginLeft: '10px' }}>⏳</span>
          </button>
        </div>

        {attachedItems.length > 0 && (
          <div className="attachment-status" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa' }}>
            <h4>Item Attachment Status:</h4>
            {attachedItems.map((item, index) => (
              <div key={index} style={{ 
                color: item.success ? '#28a745' : '#dc3545',
                margin: '5px 0'
              }}>
                {item.success ? '✅' : '❌'} {item.itemRef} - {item.success ? 'Attached' : `Failed: ${item.error}`}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderComplete = () => (
    <div className="grading-container" style={{ textAlign: 'center', padding: '50px' }}>
      <div className="grading-success" style={{
        backgroundColor: '#d4edda',
        border: '1px solid #c3e6cb',
        padding: '30px',
        borderRadius: '8px',
        color: '#155724'
      }}>
        <h3>✅ Grading Complete!</h3>
        <p>All responses have been graded successfully for student: {formData.student_id}</p>
        <p>The scores have been saved and submitted to the learner.</p>
        <button 
          onClick={resetToForm}
          style={{
            backgroundColor: '#007cba',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Grade Another Assessment
        </button>
        {renderPdfButtons()}
      </div>
    </div>
  );

  const renderError = () => (
    <div className="grading-container" style={{ textAlign: 'center', padding: '50px' }}>
      <div className="error-message" style={{
        backgroundColor: '#f8d7da',
        border: '1px solid #f5c6cb',
        padding: '30px',
        borderRadius: '8px',
        color: '#721c24'
      }}>
        <h3>❌ Error Loading Grading Interface</h3>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', textAlign: 'left' }}>{error}</pre>
        <button 
          onClick={resetToForm}
          style={{
            backgroundColor: '#dc3545',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Back to Form
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Home />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .lrn-report-item-title {
          color: #333;
          font-size: 1.2em;
          margin: 20px 0 10px 0;
          font-weight: bold;
        }
        .hr-border {
          border-top: 1px solid #ccc;
          margin: 20px 0;
        }
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #007cba;
          box-shadow: 0 0 0 2px rgba(0, 124, 186, 0.2);
        }
      `}</style>
      
      {currentStep === 'form' && renderForm()}
      {currentStep === 'loading' && renderLoading()}
      {currentStep === 'grading' && renderGrading()}
      {currentStep === 'complete' && renderComplete()}
      {currentStep === 'error' && renderError()}
      <ReportOptionsModal
        open={reportModalOpen}
        job={pdfJobs.report}
        onClose={() => setReportModalOpen(false)}
        onGenerate={generateReport}
      />
      <BulkReportModal
        open={bulkModalOpen}
        job={pdfJobs.bulkReport}
        onClose={() => setBulkModalOpen(false)}
        onGenerate={generateBulkReports}
        onSave={(blob, name) => saveBlob(blob, null, name)}
      />
    </>
  );
};

export default Grading;