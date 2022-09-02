import { useState, useEffect } from 'react'
import '../style/App.css'

const Home = () => {
  return (
    <nav className="navbar navbar-expand-lg bg-light" style={{ zIndex: '1100' }}>
      <div className="container-fluid">
        <a className="navbar-brand" href="/">Navbar</a>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse"
          data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent"
          aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item dropdown">
              <a className="nav-link dropdown-toggle" href="#" role="button"
                data-bs-toggle="dropdown" aria-expanded="false">
                Assesss
              </a>
              <ul className="dropdown-menu">
                <li><a className="dropdown-item" href="/assess">Accessment</a></li>
                <li><a className="dropdown-item" href="/item">Item</a></li>
              </ul>
            </li>
            <li className="nav-item">
              <a className="nav-link active" aria-current="page" href="/reports">Reports</a>
            </li>


            <li className="nav-item dropdown">
              <a className="nav-link dropdown-toggle" href="#" role="button"
                data-bs-toggle="dropdown" aria-expanded="false">
                Author
              </a>
              <ul className="dropdown-menu">
                <li><a className="dropdown-item" href="/author/items">Items</a></li>
                <li><a className="dropdown-item" href="/author/item-create">Create Item</a></li>
                <li><a className="dropdown-item" href="/author/multi-item">Multi Item</a></li>
                <li><a className="dropdown-item" href="/author/activity-create">Create Activity</a></li>
              </ul>
            </li>
            <li className="nav-item">
              <a className="nav-link disabled">Disabled</a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Home;
