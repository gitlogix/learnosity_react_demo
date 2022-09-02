import { useState, useEffect } from 'react';
import { ExternalScript } from '../../utils/ExternalScript';
import { ItemApiListner } from "../../utils/ItemApiListener";
import '../../style/App.css';
import Home from '../Home';
import { useParams } from 'react-router-dom';

const Item = () => {
    const param = useParams();
    const [itemAPI, setItemAPI] = useState(null);
    const [status, setStatus] = useState('');
    useEffect(() => {
        const callLearnosityAPI = async () => {
            const req = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(param),
            }
            const response = await fetch('/item-loader', req);
            const body = await response.json();
            if (response.status !== 200 && response.status !== 304) {
                throw Error(body.message)
            }
            setItemAPI(JSON.stringify(body));

            const learnosityScript = '//items.learnosity.com/?v2022.1.LTS';
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
    }, [status])

    return (
        <><Home />
            {
                status === 'ready' &&
                <>
                    {console.log(param.item)}
                    <span class="learnosity-item" data-reference={param.item}></span>
                </>
            }
        </>
    )
}

export default Item;