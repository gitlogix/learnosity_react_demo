import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ReportPage = () => {
    const navigate = useNavigate();
    const [activityId, setActivityId] = useState('');
    const [userId, setuserId] = useState('');
    const submitHandler = () => {
        navigate(`/reports/${activityId}/${userId}`);
    }
    return (
        <div style={{ position: 'absolute', top: '30%', left: '30%' }}>

            <p>Enter Activity ID Here:</p>
            <div className='enter-data' style={{ margin: '10px' }}>
                <input type='text' value={activityId} onChange={(e) => setActivityId(e.target.value)} />
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