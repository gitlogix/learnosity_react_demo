import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { ExternalScript } from '../utils/ExternalScript';
import { ItemApiListner } from "../utils/ItemApiListener";
import '../style/App.css';
import Home from './Home';

const Reports = () => {

    const [reportAPI, setReportAPI] = useState(null);
    const [status, setStatus] = useState('');

    useEffect(() => {

        const callLearnosityAPI = async () => {
            const response = await fetch('/reports-loader');
            const body = await response.json();

            if (response.status !== 200) {
                throw Error(body.message)
            }
            setReportAPI(JSON.stringify(body));
            const learnosityScript = '//items.learnosity.com/?v2022.1.LTS';
            ExternalScript(learnosityScript)
                .then(res => setStatus(res))
                .catch(e => console.log(e))
        }

        callLearnosityAPI()
            .catch(console.error);

    }, [reportAPI]);

    const navigate = useNavigate();

    useEffect(() => {
        let authenticated = '';
        if (reportAPI) {
            authenticated = JSON.parse(reportAPI);
        }

        const myListener = async () => {
            let quiz = ItemApiListner(authenticated.request);

            let result = await quiz;
            return (result);
        }

        myListener();
    }, [status])

    return (
        <><Home />
            <div className='results-container'>
                <h1 className='results-header'>🏆 Your Results 🏆</h1>
                {status === 'loading' && <p> loading... </p>}
                {
                    status === 'ready' &&
                    <div id='report-container'>
                        <div id='learnosity_report'></div>
                    </div>
                }
                <button className="btn-try-again" onClick={() => navigate('/', { replace: true })}> Try Again ? </button>
            </div>
        </>
    )
}


export default Reports;