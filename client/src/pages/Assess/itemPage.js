import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Home from '../Home';

const ItemPage = () => {
    const navigate = useNavigate();
    const [activityId, setActivityId] = useState('');
    const [userId, setUserId] = useState('');
    const [itemId, setItemId] = useState('');
    const submitHandler = () => {
        navigate(`/item/${activityId}/${userId}/${itemId}`);
    }
    return (
        <>
            <Home />
            <div style={{ position: 'absolute', top: '30%', left: '30%' }}>

                <p>Enter Activity ID Here:</p>
                <div className='enter-data' style={{ margin: '10px' }}>
                    <input type='text' value={activityId} onChange={(e) => setActivityId(e.target.value)} />
                </div>
                <p>Enter User ID Here:</p>
                <div className='enter-data' style={{ margin: '10px' }}>
                    <input type='text' value={userId} onChange={(e) => setUserId(e.target.value)} />
                </div>
                <p>Enter Item ID Here:</p>
                <div className='enter-data' style={{ margin: '10px' }}>
                    <input type='text' value={itemId} onChange={(e) => setItemId(e.target.value)} />
                </div>
                <button onClick={submitHandler} style={{ marginTop: '10px' }}>Show Activity</button>
            </div >
        </>
    )
};

export default ItemPage;