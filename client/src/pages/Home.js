import React, {useState} from 'react';
import DoctorList from '../components/DoctorList';
import AppointmentForm from '../components/AppointmentForm';

export default function Home(){
  const [selected, setSelected] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <>
      <div className="card">
        <h3>Welcome</h3>
        <p>Find doctors and book appointments quickly.</p>
      </div>

      <DoctorList onSelect={d=> setSelected(d)} key={refreshKey} />
      {selected && <AppointmentForm doctor={selected} onDone={()=>{ setSelected(null); setRefreshKey(k=>k+1); }} />}
    </>
  );
}
