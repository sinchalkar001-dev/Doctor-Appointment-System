import React, {useEffect, useState} from 'react';
import api from '../api';

export default function Admin(){
  const [doctors,setDoctors]=useState([]);
  const [name,setName]=useState('');
  const [spec,setSpec]=useState('');
  const [fees,setFees]=useState('');
  const [phone,setPhone]=useState('');

  useEffect(()=>{ fetchDoctors(); },[]);

  const fetchDoctors = async ()=>{
    try{
      const res = await api.get('/admin/doctors');
      setDoctors(res.data || []);
    }catch(err){ console.error(err); }
  }

  const addDoctor = async (e)=>{
    e.preventDefault();
    try{
      await api.post('/admin/doctors', { name, specialization: spec, fees, phone });
      setName(''); setSpec(''); setFees(''); setPhone('');
      fetchDoctors();
    }catch(err){ console.error(err); alert('failed: '+(err.response?.data?.message||err.message)); }
  }

  return (
    <div>
      <div className="card"><h3>Admin - Manage Doctors</h3></div>
      <div className="card" style={{marginTop:12}}>
        <form className="form-row" onSubmit={addDoctor}>
          <input className="input" placeholder="Doctor name" value={name} onChange={e=>setName(e.target.value)} required />
          <input className="input" placeholder="Specialization" value={spec} onChange={e=>setSpec(e.target.value)} required />
          <input className="input" placeholder="Fees" value={fees} onChange={e=>setFees(e.target.value)} />
          <input className="input" placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} />
          <div style={{width:'100%'}}><button className="button" type="submit">Add Doctor</button></div>
        </form>
        <div className="list" style={{marginTop:12}}>
          {doctors.map(d=>(
            <div className="item" key={d._id || d.id}>
              <div>
                <strong>{d.name}</strong>
                <div className="muted">{d.specialization} • Fees: {d.fees || 'N/A'}</div>
                <div className="muted">Phone: {d.phone || '—'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
