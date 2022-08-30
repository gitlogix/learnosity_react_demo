import './App.css';
import { useState } from 'react';
function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');



  const submitHandler = async (e) => {
    e.preventDefault();

    const data = { email: email };

    const req = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }

    const reponse = await fetch('http://localhost:3001/test', req)
      .catch((err => { console.log(err); }))

    console.log(reponse);


    console.log(email, password);
  };

  return (
    <div className="App">
      <form onSubmit={submitHandler}>
        <p>Email</p>
        <input type='text' placeholder='Email' value={email} onChange={(e) => setEmail(e.target.value)} />
        <p>Password</p>
        <input type='password' placeholder='Password' value={password} onChange={(e) => setPassword(e.target.value)} />
        <div>
          <button type='submit'>Submit</button>
        </div>
      </form >
    </div >
  );
};

export default App;
