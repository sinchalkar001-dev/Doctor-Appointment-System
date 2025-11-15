const express=require('express')
const colors=require('colors')
const morgan=require('morgan')
const dotenv=require('dotenv');
const connectDB = require('./config/db');
const path=require('path')
dotenv.config();
connectDB();
const app=express()

// CORS middleware - allow requests from localhost development servers
app.use((req, res, next) => {
  const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'];
  const origin = req.header('origin');
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json())
app.use(morgan('dev'))
app.use("/api/v1/user",require("./routes/userRoutes"));
app.use("/api/v1/admin", require("./routes/adminRoutes"));
app.use("/api/v1/doctor", require("./routes/doctorRoutes"));

app.use(express.static(path.join(__dirname,"./client/build")))
app.get('*',function(req,res){
    res.sendFile(path.join(__dirname,"./client/build/index.html"))
})
const port=process.env.PORT ||8080

app.listen(port,()=>{
    console.log(`server running in ${process.env.NODE_MODE} Mode on port ${process.env.PORT}`)
})