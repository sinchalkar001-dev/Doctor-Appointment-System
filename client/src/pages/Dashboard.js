import React, {useEffect, useState} from 'react';
import api from '../api';
import ProtectedRoute from '../components/ProtectedRoute';

const SAMPLE_APPTS = [
  { id: 'a1', doctor: { name: 'Dr. Ayesha Khan' }, date: '2025-11-20', time: '10:00', status: 'pending' },
  { id: 'a2', doctor: { name: 'Dr. Rohit Mehra' }, date: '2025-11-25', time: '14:30', status: 'confirmed' }
];

function InnerDashboard(){
  const [appointments,setAppointments]=useState([]);
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    let mounted = true;
    setLoading(true);
    api.get('/user/appointments')
      .then(res=>{ if(mounted) setAppointments(res.data || SAMPLE_APPTS) })
      .catch(err=>{ console.error(err); if(mounted) setAppointments(SAMPLE_APPTS) })
      .finally(()=> mounted && setLoading(false));
    return ()=> mounted = false;
  },[]);

  const statusClass = (s)=> s==='confirmed'? 'status-confirmed': s==='cancelled'? 'status-cancelled':'status-pending';

  return (
    <div>
      <div className="card"><h3>Your Appointments</h3></div>
      <div className="card" style={{marginTop:12}}>
        {loading && <div>Loading appointments…</div>}
        {!loading && appointments.length===0 && <div className="muted">No appointments found.</div>}

        <div style={{marginTop:12}}>
          {appointments.map(a=> (
            <div className="appointment" key={a._id || a.id}>
              <div>
                <strong>{a.doctor?.name || a.doctorName || 'Doctor'}</strong>
                <div className="muted">{a.date} • {a.time}</div>
              </div>
              <div className={"status-pill " + statusClass(a.status || 'pending') }>{(a.status || 'pending').toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard(){
  return <ProtectedRoute><InnerDashboard/></ProtectedRoute>;
}
