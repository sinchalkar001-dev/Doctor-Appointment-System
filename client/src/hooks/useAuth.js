import { useState, useEffect } from 'react';
export default function useAuth(){
  const [user, setUser] = useState(null);
  useEffect(()=>{
    const raw = localStorage.getItem('user');
    if(raw) setUser(JSON.parse(raw));
  },[]);
  return {user, setUser};
}
