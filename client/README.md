# Doctor Appointment - Frontend (client)

This React frontend is built to match typical backend routes used by the server in this project.

Expected backend endpoints (base: REACT_APP_API_URL, default http://localhost:8080/api/v1):
- GET  /doctor                -> list of doctors (array of doctor objects)
- POST /admin/doctors        -> create doctor (payload: { name, specialization, fees, phone })
- GET  /admin/doctors        -> list doctors (admin view)
- POST /user/register        -> register user (payload: { name, email, password })
- POST /user/login           -> login (payload: { email, password }) -> returns { token, user? }
- GET  /user/appointments    -> list user's appointments (requires Authorization header)
- POST /user/appointments   -> create appointment (payload: { doctorId, date, time, reason })

Common doctor fields used by frontend:
- _id, name, specialization, fees, phone

Common appointment fields used by frontend:
- _id, doctor (object or id), date (YYYY-MM-DD), time (HH:mm), status, reason

To run:
```
cd client
npm install
npm start
```

If your backend uses different routes/fields, update `src/api.js` and the relevant pages/components.
