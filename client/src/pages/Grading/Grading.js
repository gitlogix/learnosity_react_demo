import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Home from '../Home';
import { ExternalScript } from '../../utils/ExternalScript';

const Grading = () => {
  const { activity_id } = useParams();
  
  const [formData, setFormData] = useState({
    session_id: '19ca184a-f3e7-4d9f-8808-f322464b3223',
    student_id: '1679',
    activity_id: activity_id || '56768358-6ebc-4c81-8f77-7da75b922e72',
    activity_template_id: 'Manual Grading collection',
    items: 'e4ece8c1-974f-4d06-b361-bc09338aa895,8ea10a46-dd5a-4690-95f3-4eab20718cf9,bfb10b69-20f2-463c-bad4-edeb80f9cc51',
    grader_id: '1679'
  });

  const [currentStep, setCurrentStep] = useState('form');
  const [apiConfig, setApiConfig] = useState(null);
  const [error, setError] = useState(null);
  const [gradingApp, setGradingApp] = useState(null);
  const [attachedItems, setAttachedItems] = useState([]);

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
      const response = await fetch('http://localhost:3001/grading-api', {
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

  const resetToForm = () => {
    setCurrentStep('form');
    setError(null);
    setApiConfig(null);
    setGradingApp(null);
    setAttachedItems([]);
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
    </>
  );
};

export default Grading;