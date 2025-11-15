import React, {useEffect, useState} from 'react';
import api from '../api';
import DoctorCard from './DoctorCard';

const SAMPLE_DOCTORS = [
  { id: 'd1', name: 'Dr. Ayesha Khan', specialization: 'General Physician', fees: 500 },
  { id: 'd2', name: 'Dr. Rohit Mehra', specialization: 'Cardiologist', fees: 1200 },
  { id: 'd3', name: 'Dr. Sangeeta Rao', specialization: 'Dermatologist', fees: 700 }
];

export default function DoctorList({onSelect}){
  const [doctors,setDoctors]=useState([]);
  const [loading,setLoading]=useState(false);
  const [query,setQuery]=useState('');
  const [error,setError]=useState(null);

  useEffect(()=>{
    let mounted = true;
    setLoading(true);
    api.get('/doctor')
      .then(res=>{
        if(!mounted) return;
        const list = res.data || [];
        // if backend returned empty list, fall back to sample data
        setDoctors(list.length? list : SAMPLE_DOCTORS);
      })
      .catch(err=>{
        console.error(err);
        if(!mounted) return;
        setError('Could not load doctors from server — using local sample list.');
        setDoctors(SAMPLE_DOCTORS);
      })
      .finally(()=> mounted && setLoading(false));
    return ()=> mounted = false;
  },[]);

  const filtered = doctors.filter(d=> d.name.toLowerCase().includes(query.toLowerCase()) || (d.specialization||'').toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="card" style={{marginTop:12}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h3 style={{margin:0}}>Available Doctors</h3>
        <input className="input" placeholder="Search name or specialization" value={query} onChange={e=>setQuery(e.target.value)} style={{maxWidth:320}} />
      </div>

      {loading && <div style={{marginTop:12}}>Loading doctors…</div>}
      {error && <div className="muted" style={{marginTop:8}}>{error}</div>}

      <div className="doctors-grid">
        {filtered.length===0 && !loading && <div className="muted">No doctors match your search.</div>}
        {filtered.map(d=> (
          <div className="doctor-card" key={d._id || d.id}>
            <h4>{d.name}</h4>
            <div className="muted">{d.specialization}</div>
            <div style={{marginTop:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div className="badge">Fees: {d.fees? '₹'+d.fees : 'N/A'}</div>
              <button className="button" onClick={()=>onSelect(d)}>Book</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
