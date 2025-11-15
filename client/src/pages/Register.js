import React, {useState} from 'react';
import api from '../api';
import {useNavigate} from 'react-router-dom';

export default function Register(){
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const nav = useNavigate();

  const submit = async (e)=>{
    e.preventDefault();
    try{
      await api.post('/user/register', { name, email, password });
      alert('Registered. Please login.');
      nav('/login');
    }catch(err){
      console.error(err);
      alert('Register failed: '+ (err.response?.data?.message || err.message));
    }
  }

  return (
    <div className="card">
      <h3>Register</h3>
      <form onSubmit={submit} className="form-row">
        <input className="input" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} required />
        <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input className="input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <div style={{width:'100%'}}><button className="button" type="submit">Register</button></div>
      </form>
    </div>
  );
}
