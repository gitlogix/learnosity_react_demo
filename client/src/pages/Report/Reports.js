import { useState, useEffect } from 'react';
import { useNavigate, useParams } from "react-router-dom";
import { ExternalScript } from '../../utils/ExternalScript';
import { ItemApiListner } from "../../utils/ItemApiListener";
import '../../style/App.css';
import Home from '../Home';

const Reports = () => {
    const { act, uid } = useParams();
    const [reportAPI, setReportAPI] = useState(null);
    const [status, setStatus] = useState('');
    const navigate = useNavigate();
    console.log(act, uid)

    useEffect(() => {

        const callLearnosityAPI = async () => {
            const req = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ session_id: localStorage.getItem('session_id'), user_id: uid }),
            }
            const response = await fetch('/reports-questions', req);
            const body = await response.json();
            if (response.status !== 200) {
                throw Error(body.message)
            }
            setReportAPI(JSON.stringify(body));
            const learnosityScript = '//reports.learnosity.com/?v2022.1.LTS';
            ExternalScript(learnosityScript)
                .then(res => setStatus(res))
                .catch(e => console.log(e))
        }

        callLearnosityAPI()
            .catch(console.error);

    }, [uid]);



    useEffect(() => {
        let authenticated = '';
        if (reportAPI) {
            authenticated = JSON.parse(reportAPI);
            console.log(authenticated);
        }
        console.log('authenticated',authenticated);
        const myListener = async () => {
            let quiz = ItemApiListner(authenticated.request);

            let result = await quiz;
            return (result);
        }

        myListener();
    }, [status,reportAPI])

    return (
        <><Home />
            <div className='results-container'>
                <h1 className='results-header'>🏆 Your Results 🏆</h1>
                {status !== 'ready' && <p> loading... </p>}
                {
                    status === 'ready' &&
                    <div id='report-container'>
                        <div id='report-demo2'></div>
                    </div>
                }
                <button className="btn-try-again" onClick={() => navigate('/', { replace: true })}> Try Again ? </button>
            </div>
        </>
    )
}


export default Reports;