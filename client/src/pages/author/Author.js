import { useState, useEffect } from 'react';
import { ExternalScript } from '../../utils/ExternalScript';
import { ItemApiListner } from "../../utils/ItemApiListener";
import '../../style/App.css';
import Home from '../Home';

const Author = () => {
    const [itemAPI, setItemAPI] = useState(null);
    const [status, setStatus] = useState('');

    useEffect(() => {
        const callLearnosityAPI = async () => {
            const response = await fetch('/author');
            const body = await response.json();
            if (response.status !== 200 && response.status !== 304) {
                throw Error(body.message)
            }
            setItemAPI(JSON.stringify(body));

            const learnosityScript = '//authorapi.learnosity.com/?v2023.1.LTS';
            ExternalScript(learnosityScript)
                .then(res => setStatus(res))
                .catch(e => console.log(e))
        }

        callLearnosityAPI()
            .catch(console.error);

    }, []);
    useEffect(() => {
        let authenticated = '';
        if (itemAPI) {
            authenticated = JSON.parse(itemAPI);
        }

        const myListener = async () => {
            let quiz = ItemApiListner(authenticated.request);

            let result = await quiz;
            return (result);
        }

        myListener();
    }, [status]);

    return (
        <>
            <Home />
            {
                status === 'ready' &&
                <div id='section pad-sml'>
                    <div id='learnosity-author'></div>
                </div>
            }
        </>
    )
}

export default Author;