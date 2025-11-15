import React, {useState} from 'react';
import api from '../api';
import {useNavigate} from 'react-router-dom';

export default function Login(){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const nav = useNavigate();

  const submit = async (e)=>{
    e.preventDefault();
    try{
      const res = await api.post('/user/login', { email, password });
      // store token and user if returned
      localStorage.setItem('token', res.data.token);
      if(res.data.user) localStorage.setItem('user', JSON.stringify(res.data.user));
      api.defaults.headers.common['Authorization'] = 'Bearer ' + res.data.token;
      alert('Logged in');
      nav('/dashboard');
    }catch(err){
      console.error(err);
      alert('Login failed: '+ (err.response?.data?.message || err.message));
    }
  }

  return (
    <div className="card">
      <h3>Login</h3>
      <form onSubmit={submit} className="form-row">
        <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input className="input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <div style={{width:'100%'}}><button className="button" type="submit">Login</button></div>
      </form>
    </div>
  );
}
