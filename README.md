# E-Medico - Modern Doctor Appointment System

A production-ready, industry-level doctor appointment booking system built with modern technologies.

## 🎯 Features

### For Patients
- ✅ Easy doctor discovery with search and filtering by specialization
- ✅ One-click appointment booking with real-time availability
- ✅ Manage all your appointments in a personal dashboard
- ✅ Cancel or reschedule appointments anytime
- ✅ Secure authentication with JWT tokens
- ✅ Beautiful, responsive UI for mobile and desktop

### For Administrators
- ✅ Comprehensive admin dashboard with statistics
- ✅ Manage doctors (add, edit, delete)
- ✅ View and manage all appointments
- ✅ User management
- ✅ Real-time appointment status updates

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library
- **React Router v6** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **Axios** - HTTP client

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **JWT** - Secure authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin requests

## 📋 Prerequisites

Before you begin, ensure you have installed:
- Node.js (v16 or higher)
- npm or yarn
- MongoDB (local or MongoDB Atlas)

## 🚀 Quick Start

### 1. **Clone & Setup**

```bash
# Navigate to project root
cd doctor-appointment-system

# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### 2. **Configure Environment Variables**

Create a `.env` file in the root directory:

```env
MONGODB_URI=mongodb://localhost:27017/doctor-appointment-system
NODE_ENV=development
PORT=5000
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
BCRYPT_ROUNDS=10
```

### 3. **Start MongoDB**

If using local MongoDB:
```bash
mongod
```

Or use MongoDB Atlas and update `MONGODB_URI` with your connection string.

### 4. **Seed Sample Data**

```bash
npm run seed
```

This will create:
- 8 sample doctors with different specializations
- 3 demo users (including admin)

**Demo Credentials:**
- Email: `john@example.com` Password: `password123` (User)
- Email: `admin@example.com` Password: `password123` (Admin)

### 5. **Start the Application**

#### Option A: Run both backend and frontend concurrently
```bash
npm run dev
```

#### Option B: Run separately in different terminals

Terminal 1 (Backend on port 5000):
```bash
npm run server
```

Terminal 2 (Frontend on port 3000):
```bash
npm run client
```

### 6. **Access the Application**

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api

## 📁 Project Structure

```
doctor-appointment-system/
├── config/
│   └── db.js                 # MongoDB connection
├── middleware/
│   └── auth.js               # JWT authentication
├── models/
│   ├── User.js              # User schema
│   ├── Doctor.js            # Doctor schema
│   └── Appointment.js       # Appointment schema
├── routes/
│   ├── auth.js              # Authentication endpoints
│   ├── doctors.js           # Doctor endpoints
│   ├── appointments.js      # Appointment endpoints
│   └── admin.js             # Admin endpoints
├── scripts/
│   └── seedData.js          # Database seeding
├── server.js                # Express server
├── .env                     # Environment variables
├── package.json             # Backend dependencies
└── client/
    ├── src/
    │   ├── components/
    │   │   ├── DoctorCard.js
    │   │   ├── AppointmentForm.js
    │   │   └── ProtectedRoute.js
    │   ├── pages/
    │   │   ├── Home.js
    │   │   ├── Login.js
    │   │   ├── Register.js
    │   │   ├── Dashboard.js
    │   │   └── Admin.js
    │   ├── api.js            # API client
    │   ├── App.js            # Main app
    │   ├── index.js          # Entry point
    │   └── index.css         # Global styles
    ├── public/
    │   └── index.html
    ├── package.json          # Frontend dependencies
    ├── tailwind.config.js    # Tailwind configuration
    └── postcss.config.js     # PostCSS configuration
```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Doctors
- `GET /api/doctors` - Get all doctors (with filters)
- `GET /api/doctors/:id` - Get single doctor
- `POST /api/doctors` - Create doctor (auth required)
- `PUT /api/doctors/:id` - Update doctor (auth required)
- `DELETE /api/doctors/:id` - Delete doctor (auth required)

### Appointments
- `GET /api/appointments` - Get user's appointments (auth required)
- `GET /api/appointments/:id` - Get single appointment (auth required)
- `POST /api/appointments` - Book appointment (auth required)
- `PUT /api/appointments/:id` - Update appointment (auth required)
- `DELETE /api/appointments/:id` - Cancel appointment (auth required)

### Admin
- `GET /api/admin/stats` - Dashboard statistics (auth required)
- `GET /api/admin/appointments` - All appointments (auth required)
- `PUT /api/admin/appointments/:id` - Update appointment status (auth required)
- `GET /api/admin/doctors` - All doctors (auth required)
- `GET /api/admin/users` - All users (auth required)

## 🔐 Authentication

The application uses JWT (JSON Web Tokens) for secure authentication:
1. Users register or login
2. Server returns a JWT token
3. Token is stored in localStorage
4. Token is sent with every API request in Authorization header
5. Protected routes require valid token

## 🎨 Design Highlights

- **Modern UI**: Built with Tailwind CSS for a professional look
- **Responsive Design**: Works seamlessly on mobile, tablet, and desktop
- **Accessibility**: Semantic HTML and proper ARIA labels
- **Performance**: Optimized images, lazy loading, and efficient state management
- **User Experience**: Smooth transitions, clear feedback, and intuitive navigation

## 📱 Features in Detail

### Home Page
- Browse all doctors
- Filter by specialization
- Search by name or specialization
- Quick view of doctor details (experience, fees, phone)
- One-click booking

### Dashboard
- View all appointments
- Book new appointments
- Cancel appointments
- Appointment status tracking
- Quick statistics

### Admin Panel
- Dashboard with key statistics
- Manage doctors (CRUD operations)
- Manage appointments (view and update status)
- View all users
- Generate insights

## 🔍 Error Handling

The application includes comprehensive error handling:
- Input validation on both frontend and backend
- Proper HTTP status codes
- User-friendly error messages
- Logging for debugging

## 🚀 Production Deployment

For production deployment:

1. **Update environment variables**:
   - Change `JWT_SECRET` to a strong random string
   - Set `NODE_ENV=production`
   - Use MongoDB Atlas for database

2. **Build frontend**:
   ```bash
   cd client
   npm run build
   cd ..
   ```

3. **Run on production server**:
   ```bash
   npm start
   ```

4. **Use a process manager** (e.g., PM2):
   ```bash
   npm install -g pm2
   pm2 start server.js --name "doctor-app"
   ```

## 📝 Available Scripts

```bash
# Backend
npm start              # Start backend server
npm run server         # Start with nodemon
npm run seed           # Seed database with sample data
npm run dev            # Start both backend and frontend

# Frontend (from client directory)
npm start              # Start development server
npm run build          # Build for production
npm test               # Run tests
```

## 🤝 Contributing

Feel free to fork this project and submit pull requests for any improvements!

## 📄 License

This project is open source and available under the ISC License.

## 💡 Tips for Customization

1. **Change app name**: Search "MediCare" in all files
2. **Add more specializations**: Add to seed data
3. **Customize colors**: Edit `client/tailwind.config.js`
4. **Add more features**: Follow existing patterns for new routes and components

## 🐛 Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check `MONGODB_URI` in .env
- Verify database name is correct

### Port Already in Use
- Change `PORT` in .env (default: 5000)
- For frontend, set `PORT=3001 npm start` in client

### CORS Errors
- Check that frontend and backend URLs match
- Verify `proxy` setting in client/package.json

### Token Expired
- Tokens expire after 7 days (configurable via `JWT_EXPIRE`)
- Users need to login again to get new token

## 📞 Support

For issues or questions, please create an issue in the repository.

---

**Built with ❤️ for modern healthcare appointment management**
