# E-Medico

An online doctor appointment system built on the MERN stack. Patients search a department directory and book open times, doctors confirm and manage their own schedule, and administrators run the clinic. Changes appear on every open screen in real time.

The repository is split into two apps:

| Folder | What it is |
| --- | --- |
| [`client/`](client) | React 18 single-page app (Create React App, Tailwind CSS, React Router) |
| [`server/`](server) | Express REST API with MongoDB (Mongoose), JWT authentication and Server-Sent Events |

## Features

### Patients

- Browse doctors by department, search by name or specialty, and sort by fee or experience.
- Book from the doctor's real open times. Days off and fully booked days are disabled, and taken times are crossed out.
- Reschedule or cancel upcoming appointments, and read the doctor's note after a visit.
- See confirmations and cancellations the moment the doctor makes them, with no refresh.

### Doctors

- A personal schedule: today's appointments, requests waiting for confirmation, upcoming, past and cancelled visits.
- Confirm or decline requests, cancel with a reason, and mark visits completed with a note for the patient.
- Set working days, hours, a daily break and appointment length. Patients only see times inside these hours.

### Administrators

- Overview of doctors, users and appointments, with a status breakdown and a queue of requests to confirm.
- Add, edit and remove doctors, set their working hours, and give them a sign-in for the doctor portal.
- Review every appointment with filters and pagination, and see all registered users by role.

### Platform

- Role-based access control on every API route (patient, doctor, admin).
- Double booking is impossible: a unique database index allows one active booking per doctor, date and time, even under simultaneous requests.
- Passwords hashed with bcrypt, signed JWT sessions, and password changes that sign out every other device.
- Rate-limited sign-in and registration, input validation on every write, and protective response headers.
- Accessible, responsive interface: keyboard navigation, focus management in dialogs, visible labels and reduced-motion support.

## Getting started

You need Node.js 18 or newer and MongoDB (local, or a MongoDB Atlas connection string).

```bash
# 1. Install everything (root, server and client)
npm run install:all

# 2. Configure the server
cp server/.env.example server/.env      # then set JWT_SECRET and MONGODB_URI

# 3. Load demo data (this resets the database named in MONGODB_URI)
npm run seed

# 4. Run the API (port 5000) and the React app (port 3000) together
npm run dev
```

Open <http://localhost:3000>.

### Demo accounts

Every seeded account uses the password `password123`.

| Role | Email |
| --- | --- |
| Patient | `john@example.com` |
| Patient | `jane@example.com` |
| Doctor | `sarah.johnson@example.com` (every seeded doctor has a sign-in: `firstname.lastname@example.com`) |
| Admin | `admin@example.com` |

### Scripts

Run these from the project root.

| Command | What it does |
| --- | --- |
| `npm run install:all` | Installs root, server and client dependencies |
| `npm run dev` | Starts the API with nodemon and the React dev server |
| `npm run server` / `npm run client` | Starts one side only |
| `npm run seed` | Resets the database and loads demo data |
| `npm test` | Runs the server's scheduling tests (Node's built-in test runner) |
| `npm run build` | Builds the React app into `client/build` |
| `npm start` | Starts the API; it also serves `client/build` when it exists |

### Environment variables

`server/.env` (see [`server/.env.example`](server/.env.example)):

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Required. Long random string used to sign sessions (32+ characters in production) |
| `JWT_EXPIRE` | Session length, default `7d` |
| `PORT` | API port, default `5000` |
| `CLIENT_ORIGIN` | Optional comma-separated list of allowed browser origins |
| `BCRYPT_ROUNDS` | Password hashing cost, default `10` |

`client/.env` is optional. By default the client calls `/api`, which the development proxy forwards to port 5000. Set `REACT_APP_API_URL` only if the API lives elsewhere.

## Project structure

```
client/
  src/
    api.js                 API client (axios) and live-updates URL
    components/            App shell, booking form, availability editor, live-updates provider
    components/ui/         Design-system components: buttons, fields, dialog, toasts, tabs, badges
    pages/                 Home, sign in, register, dashboard, doctor portal, account, admin
    lib/                   Date, fee, department and scheduling helpers
    styles/tokens.css      Design tokens (primitive, semantic and component layers)
server/
  app.js                   Express app: security headers, CORS, routes, errors, static client
  server.js                Entry point: config check, database connection, graceful shutdown
  config/                  Environment and MongoDB connection
  middleware/              Authentication and roles, validation, rate limiting, errors
  models/                  User, Doctor (with availability), Appointment
  routes/                  auth, doctors, appointments, doctor portal, admin, events
  services/                Scheduling rules, appointment workflow, real-time hub
  scripts/seedData.js      Demo data
  tests/                   Scheduling tests
```

## API

All routes are under `/api`. Send `Authorization: Bearer <token>` for protected routes.

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Create a patient account |
| POST | `/auth/login` | Public | Sign in |
| GET / PUT | `/auth/me` | Signed in | Read or update your profile |
| PUT | `/auth/password` | Signed in | Change password (returns a new token) |
| GET | `/doctors` | Public | List doctors (`specialization`, `q`, `page`, `limit`) |
| GET | `/doctors/:id/slots?date=` | Public | Every slot on a date and whether it is open |
| GET | `/doctors/:id/calendar?from=&days=` | Public | Open-slot counts per day |
| POST / PUT / DELETE | `/doctors/:id` | Admin | Manage doctors, working hours and portal sign-ins |
| GET / POST | `/appointments` | Signed in | Your appointments, or book one |
| PATCH | `/appointments/:id/reschedule` | Owner | Move to another open time |
| PATCH | `/appointments/:id/cancel` | Owner | Cancel |
| GET | `/doctor/appointments` | Doctor | Your schedule |
| PATCH | `/doctor/appointments/:id` | Doctor | Confirm, cancel or complete, with a reason or note |
| PUT | `/doctor/availability` | Doctor | Set working days, hours, break and slot length |
| GET | `/admin/stats` | Admin | Counts by status, today's bookings, portal sign-ins |
| GET / PATCH | `/admin/appointments` | Admin | Review and update any appointment |
| GET | `/admin/doctors`, `/admin/users` | Admin | Directory and users |
| GET | `/events?token=` | Signed in | Live-updates stream (Server-Sent Events) |
| GET | `/health` | Public | Health check |

Appointment statuses move from `pending` to `confirmed` to `completed`, and `pending` or `confirmed` can become `cancelled`.

### Real-time updates

Each signed-in tab keeps one Server-Sent Events connection to `/api/events`. The server pushes:

- `appointment` to the patient, the doctor and admins when a booking is made, moved, confirmed, completed or cancelled
- `slots` to everyone when a doctor's open times change, so booking forms refresh on their own
- `directory` when an admin adds, edits or removes a doctor

Browsers allow six connections per site over HTTP/1.1, so the client closes its stream whenever a page is hidden. In production, serve the app over HTTP/2 (for example behind nginx or a cloud load balancer) so many open tabs never compete for connections.

## Production

```bash
npm run build     # builds client/build
npm start         # serves the API and the built client from one port
```

Set `NODE_ENV=production`, a strong `JWT_SECRET`, and `CLIENT_ORIGIN` if the client is hosted on another domain. Rate-limit counters and live-update connections are kept in memory, which suits a single server process. Running several instances would need a shared store such as Redis for both.

## Troubleshooting

- **The API won't start.** Check that MongoDB is running and that `MONGODB_URI` and `JWT_SECRET` are set in `server/.env`.
- **Sign-in says "Too many attempts".** The limiter allows 20 attempts per 15 minutes per address. Wait, or restart the API in development.
- **The status reads "Live updates off".** Your session may have expired. Sign in again.
