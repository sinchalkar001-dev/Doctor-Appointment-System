import React from 'react';

export default function DoctorCard({doctor, onBook}){
  return (
    <div className="item">
      <div>
        <strong>{doctor.name}</strong>
        <div className="muted">{doctor.specialization}</div>
        <div className="muted">Fees: {doctor.fees ? '₹'+doctor.fees : 'N/A'}</div>
      </div>
      <div className="inline">
        <button className="button" onClick={()=>onBook(doctor)}>Book</button>
      </div>
    </div>
  );
}
