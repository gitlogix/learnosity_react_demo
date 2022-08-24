import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Assess from './pages/Assess';
import Author from './pages/Author';
import Reports from './pages/Reports';
import './style/App.css'

const App = () => {
  return (
    <BrowserRouter>
      <Routes>

        <Route exact path='/' element={<Home />} />
        <Route exact path='/assess' element={<Assess />} />
        <Route exact path='/author' element={<Author />} />
        <Route exact path='/reports' element={<Reports />} />

      </Routes>
    </BrowserRouter>
  )
}


export default App;
