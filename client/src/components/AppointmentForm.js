import React, {useState} from 'react';
import api from '../api';

export default function AppointmentForm({doctor, onDone}){
  const [date,setDate]=useState('');
  const [time,setTime]=useState('');
  const [reason,setReason]=useState('');
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState(null);

  const handleSubmit = async (e)=>{
    e.preventDefault();
    if(!doctor){ setMessage({type:'error', text:'Select a doctor first'}); return; }
    setLoading(true);
    setMessage(null);
    try{
      // backend commonly expects: doctorId, date, time, reason
      const payload = { doctorId: doctor._id || doctor.id, date, time, reason };
      console.log('Sending appointment payload:', payload);
      const response = await api.post('/user/appointments', payload);
      console.log('Appointment response:', response.data);
      setMessage({type:'success', text:'Appointment requested successfully.'});
      setDate(''); setTime(''); setReason('');
      setTimeout(()=>{ onDone && onDone(); }, 900);
    }catch(err){
      console.error('Error creating appointment:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Unknown error occurred';
      setMessage({type:'error', text: 'Failed to create appointment: '+ errorMsg});
    }finally{ setLoading(false); }
  }

  return (
    <div className="card" style={{marginTop:12}}>
      <h3>Book with {doctor?.name || '—'}</h3>
      <div className="muted" style={{marginBottom:8}}>{doctor?.specialization}{doctor?.fees? ` • Fees: ₹${doctor.fees}`:''}</div>
      <form onSubmit={handleSubmit} className="form-row">
        <input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} required />
        <input className="input" type="time" value={time} onChange={e=>setTime(e.target.value)} required />
        <input className="input" placeholder="Reason (e.g., Checkup)" value={reason} onChange={e=>setReason(e.target.value)} />
        <div style={{width:'100%'}}>
          <button className="button" type="submit" disabled={loading}>{loading? 'Booking...':'Book Appointment'}</button>
        </div>
      </form>
      {message && (
        <div style={{marginTop:12}} className={message.type==='error'? 'muted':'badge'}>
          {message.text}
        </div>
      )}
    </div>
  );
}
