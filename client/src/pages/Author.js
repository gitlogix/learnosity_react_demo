import { useState, useEffect } from 'react';
import { useExternalScript } from '../hooks/useExternalScript';
import { AuthorWithScriptLoaded } from '../components/AuthorWithScriptLoaded';
import '../style/App.css';

const Author = () => {
    const [itemAPI, setItemAPI] = useState(null);

    useEffect(() => {
        const callLearnosityAPI = async () => {
            const response = await fetch('/author');
            const body = await response.json();
            if (response.status !== 200 && response.status !== 304) {
                throw Error(body.message)
            }
            setItemAPI(JSON.stringify(body));
        }

        callLearnosityAPI()
            .catch(console.error);

    }, []);


    let authenticated = '';
    if (itemAPI) {
        authenticated = JSON.parse(itemAPI);
    }
    const learnosityScript = '//authorapi.learnosity.com/?v2022.1.LTS';
    const status = useExternalScript(learnosityScript, authenticated.request);

    return (
        <>
            {status === 'ready' && <AuthorWithScriptLoaded />}
        </>
    )
}

export default Author;