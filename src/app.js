const express = require('express');
const applyMiddleWare = require('./middlewares/applyMiddleware');
const connectDB = require('./db/connectDB');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000;

const authenticationRoutes = require('./routes/authentication/index')

applyMiddleWare(app)





//jwt related api
app.use(authenticationRoutes)
  











app.get('/health' , (req,res) =>{
    res.send('skillSurge is running')
})

// handling all (get,post,update,delete.....) unhandled routes
app.all("*", (req, res, next) => {
    const error = new Error(`Can't find ${req.originalUrl} on the server`);
    error.status = 404;
    next(error);
  });

  app.use((err,req,res,next) => {
    res.status(err.status || 500).json({
        message:err.message 
    })
  })



const main = async() => {
   await connectDB()
 app.listen(port , () =>{
    console.log(`SkillSurge is running on port ${port}`);
})
   
} 

main()