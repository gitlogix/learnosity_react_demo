import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ReportPage = () => {
    const navigate = useNavigate();
    const [sessionId, setSessionId] = useState('');
    const [userId, setuserId] = useState('');

    const submitHandler = () => {
        navigate(`/reports/${sessionId}/${userId}`);
    }
    return (
        <div style={{ position: 'absolute', top: '30%', left: '30%' }}>
            <p>Enter Session Id Here:</p>
            <div className='enter-data' style={{ margin: '10px' }}>
                <input type='text' value={sessionId} onChange={(e) => setSessionId(e.target.value)} />
            </div>
            <p>Enter User ID Here:</p>
            <div className='enter-data' style={{ margin: '10px' }}>
                <input type='text' value={userId} onChange={(e) => setuserId(e.target.value)} />
            </div>
            <button onClick={submitHandler} style={{ marginTop: '10px' }}>Show Activity</button>
        </div >
    )
};

export default ReportPage;