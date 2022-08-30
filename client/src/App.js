import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Assess from './pages/Assess/Assess';
import Author from './pages/author/Author';
import AuthorMultipleItem from './pages/author/AuthorMultipleItem';
import AuthorCreateItem from './pages/author/AuthorCreateItem';
import Reports from './pages/Report/Reports';
import AuthorCreateActivity from './pages/author/AuthorCreateActivity';

import './style/App.css'
import AssessPage from './pages/Assess/AssessPage';
import ReportPage from './pages/Report/ReportPage';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route exact path='/' element={<Home />} />
        <Route exact path='/assess' element={<AssessPage />} />
        <Route exact path='/assess/:act/:uid' element={<Assess />} />
        <Route exact path='/author/items' element={<Author />} />
        <Route exact path='/author/multi-item' element={<AuthorMultipleItem />} />
        <Route exact path='/author/item-create' element={<AuthorCreateItem />} />
        <Route exact path='/author/activity-create' element={<AuthorCreateActivity />} />
        <Route exact path='/reports/:act/:uid' element={<Reports />} />
        <Route exact path='/reports' element={<ReportPage />} />
      </Routes>
    </BrowserRouter>
  )
}


export default App;
