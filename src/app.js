// const express = require('express')
// require('dotenv').config()
// const app = express()
// const port = process.env.PORT || 5000;

// app.get('/health' , (req,res) =>{
//     res.send('skillSurge is running')
// })

// // handling all (get,post,update,delete.....) unhandled routes
// app.all("*", (req, res, next) => {
//     const error = new Error(`Can't find ${req.originalUrl} on the server`);
//     error.status = 404;
//     next(error);
//   });

//   app.use((err,req,res,next) => {
//     res.status(err.status || 500).json({
//         message:err.message 
//     })
//   })


// app.listen(port , () =>{
//     console.log(`SkillSurge is running on port ${port}`);
// })