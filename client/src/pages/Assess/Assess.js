import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { ExternalScript } from '../../utils/ExternalScript';
import { ItemApiListner } from "../../utils/ItemApiListener";
import Home from '../Home';

import '../../style/assess.css';

const Assess = () => {
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
      const response = await fetch('/quiz-loader', req);
     

      const body = await response.json();

      let session_id = body?.request?.request?.session_id
      localStorage.setItem('session_id',session_id)

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
    <>
      <Home />
      {
        status === 'ready' &&
        <div id='quiz-container'>
          <div id='learnosity_assess'></div>
        </div>
      }
    </>
  )
}

export default Assess;