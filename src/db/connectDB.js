const mongoose = require("mongoose");
require("dotenv").config();

const getConnectionString = () => {
  let connectionURI;
  if (process.env.NODE_ENV === "development") {
    connectionURI = process.env.DATABASE_LOCAL,
      connectionURI = connectionURI.replace("<username>",process.env.DATABASE_LOCAL_USERNAME)
      
      connectionURI = connectionURI.replace("<password>",process.env.DATABASE_LOCAL_PASSWORD)
  }else{
    connectionURI=process.env.DATABASE_PROD
  }

  return connectionURI
};



// const getConnectionString = () => {
//   let connectionURI;
//   if (process.env.NODE_ENV === "development") {
//     connectionURI = process.env.DATABASE_LOCAL
//       .replace("<username>", process.env.DATABASE_LOCAL_USERNAME)
//       .replace("<password>", process.env.DATABASE_LOCAL_PASSWORD);
//   } else {
//     connectionURI = process.env.DATABASE_PROD;
//   }

//   return connectionURI;
// };







const connectDB= async() =>{

    console.log('Connecting to database...');
    const uri = getConnectionString()
console.log(uri);
    await mongoose.connect(uri,{dbName:process.env.DB_NAME})
    console.log('Connected to database');
}

module.exports= connectDB 