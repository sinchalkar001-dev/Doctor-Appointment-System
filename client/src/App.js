import React, {useState, useEffect} from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';

export default function App(){
  const [user,setUser] = useState(null);

  useEffect(()=>{
    const u = localStorage.getItem('user');
    if(u) setUser(JSON.parse(u));
  },[]);

  const logout = ()=>{
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  }

  return (
    <div className="container">
      <header className="header">
        <h2>Doctor Appointment System</h2>
        <nav>
          <Link to="/" style={{marginRight:12}}>Home</Link>
          {!user && <><Link to="/login" style={{marginRight:12}}>Login</Link>
          <Link to="/register" style={{marginRight:12}}>Register</Link></>}
          <Link to="/dashboard" style={{marginRight:12}}>Dashboard</Link>
          {user && <span style={{marginLeft:8}} className="muted">{user.name}</span>}
          {user && <button onClick={logout} className="button secondary" style={{marginLeft:12}}>Logout</button>}
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home/>} />
          <Route path="/login" element={<Login/>} />
          <Route path="/register" element={<Register/>} />
          <Route path="/dashboard" element={<Dashboard/>} />
          <Route path="/admin" element={<Admin/>} />
        </Routes>
      </main>

      <footer className="muted" style={{marginTop:24,textAlign:'center'}}>
        Built for Doctor Appointment project.
      </footer>
    </div>
  );
}
