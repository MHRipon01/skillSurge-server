const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require("jsonwebtoken");
require('dotenv').config()
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);




const port = process.env.PORT || 5000;

//middleware
app.use(cors())
app.use(express.json())
 

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









const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sarjove.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




const AllClassesCollection = client.db("skillsurgeDB").collection("AllClasses");
const userCollection = client.db("skillsurgeDB").collection("userCollection");
const enrollmentCollection = client.db("skillsurgeDB").collection("enrollments");
const paymentCollection = client.db("skillsurgeDB").collection("paymentAndClasses");
const teacherRequestCollection = client.db("skillsurgeDB").collection("teacherRequest");
const pendingClassRequestCollection = client.db("skillsurgeDB").collection("pendingClasses");
const assignmentCollection = client.db("skillsurgeDB").collection("assignments");
const reviewCollection = client.db("skillsurgeDB").collection("reviews");
const submittedAssignmentCollection = client.db("skillsurgeDB").collection("submitAssignment");




//jwt related api
app.post("/jwt", async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });
  res.send({ token });
});

//middlewares
const verifyToken = (req, res, next) => {
  // console.log("inside verify token", req.headers.authorization);
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = req.headers.authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};


//use verify admin after verify token
const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  const isAdmin = user?.role === "admin";
  if (!isAdmin) {
    return res.status(403).send({ message: "forbidden access" });
  }
  next();
};


// ---------------------------------------------------
//mongoose trying
// app.get('/all-class', async (req, res) => {
//   try {
//     const result = await AllClasses.find({});
//     console.log(result);
//     res.send(result);
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Internal Server Error');
//   }
// });
// connectDB()













// getting all the class of all teachers

app.get('/all-class', async (req, res) => {
  const page = parseInt(req.query.page)   // Get page number from query parameter or default to 1
  console.log(page);
  const pageSize = parseInt(req.query.pageSize)   // Get page size from query parameter or default to 10
console.log(pageSize);
  const skip = (page - 1) * pageSize; // Calculate how many documents to skip

  try {
    const totalDocuments = await AllClassesCollection.countDocuments();
    const totalPages = Math.ceil(totalDocuments / pageSize);

    const result = await AllClassesCollection.find()
      .skip(skip)
      .limit(pageSize)
      .toArray();

    res.json({
      data: result,
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error("Error fetching paginated classes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});








//getting single data by id from collection for classDetails page in front end
app.get("/singleClass/:id", async (req, res) => {
    const id = req.params.id;
    // console.log(id);
    const query = { _id: new ObjectId(id) };
  // console.log(q);
    const result = await AllClassesCollection.findOne(query);

    // Check if the result exists
    if (result) {
          res.send(result);
      
    } else {
      res.status(404).json({ message: "class not found" });
    }
  });
  


 
  //payment intent
app.post("/create-payment-intent", async (req, res) => {
  const { price } = req.body;
  const amount = parseInt(price * 100);
  console.log("amount inside intent", amount);
  // return

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: "usd",
    payment_method_types: ["card"],
  });
  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});


//saving the payment in db
app.post("/payments", async (req, res) => {
  const payment = req.body;
  const paymentResult = await paymentCollection.insertOne(payment);

  console.log("payment info ", payment);
  res.send({ paymentResult }); 
});


//getting particular user's paid classes

app.get("/payments/:email", verifyToken, async (req, res) => {
  const query = { email: req.params.email };
  console.log(query);
  if (req.params.email !== req.decoded.email) {
    return res.status(403).send({ message: "forbidden access" });
  }
  const result = await paymentCollection.find(query).toArray();
  res.send(result);
});


app.get('/enrolledClass/:id' ,async (req, res) => {
  const id = req.params.id
  const query = { _id: new ObjectId(id) };
  console.log(query);
 
  const result = await paymentCollection.find(query).toArray();
  res.send(result);
});





//counting all the classes in the collection of all classes
app.get("/classes/count",  async (req, res) => {
    try {
      const classCount = await AllClassesCollection.countDocuments();
      res.send({ count: classCount });
    } catch (error) {
      console.error("Error getting user count:", error);
      res.status(500).send("Internal Server Error");
    }
  });


  
//counting all the users of the collection 
app.get("/users/count",  async (req, res) => {
    try {
      const userCount = await userCollection.countDocuments();
      res.send({ count: userCount });
    } catch (error) {
      console.error("Error getting user count:", error);
      res.status(500).send("Internal Server Error");
    }
  });

//counting all the enrollments by the students of the collection 
app.get("/enrollments/count",  async (req, res) => {
    try {
      const enrollmentCount = await paymentCollection.countDocuments();
      res.send({ count: enrollmentCount });
    } catch (error) {
      console.error("Error getting user count:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  //updating user in db
  app.post("/users", async (req, res) => {
    const user = req.body;
    //insert email if user doesn't exists;
    const query = { email: user.email };
    const existingUser = await userCollection.findOne(query);
    if (existingUser) {
      return res.send({ message: "user already exists", insertedId: null });
    }
    const result = await userCollection.insertOne(user);
    res.send(result);
  });
  

  //users related api
// app.get("/users", verifyToken, verifyAdmin,  async (req, res) => {
//   // console.log(req.headers);
//   const result = await userCollection.find().toArray();
//   res.send(result);
// });



app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const skip = (page - 1) * pageSize;

  try {
    const totalDocuments = await userCollection.countDocuments();
    const totalPages = Math.ceil(totalDocuments / pageSize);

    const users = await userCollection
      .find()
      .skip(skip)
      .limit(pageSize)
      .toArray();

    res.json({
      data: users,
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error("Error fetching paginated users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});















//getting the only user's data from user database

app.get("/users/:email", verifyToken,  async (req, res) => {
  // console.log(req.headers);
  const email = req.params.email
  console.log(email);
  const result = await userCollection.findOne({email})
  console.log(result);
  res.send(result);
});


  app.get("/users/admin/:email", verifyToken, async (req, res) => {
    const email = req.params.email;
    if (email !== req.decoded.email) {
      return res.status(403).send({ message: "forbidden access" });
    }
    const query = { email: email };
    const user = await userCollection.findOne(query);
    let admin = false;
    if (user) {
      admin = user.role === "admin";
    }
    res.send({ admin });
  });
  

  app.get("/users/teacher/:email", verifyToken, async (req, res) => {
    const email = req.params.email;
    if (email !== req.decoded.email) {
      return res.status(403).send({ message: "forbidden access" });
    }
    const query = { email: email };
    const user = await userCollection.findOne(query);
    let teacher = false;
    if (user) {
      teacher = user.role === "teacher";
    }
    res.send({ teacher });
  });
  


  app.get("/users/student/:email", verifyToken, async (req, res) => {
    const email = req.params.email;
    // console.log('line 265' , req.decoded.email);
    if (email !== req.decoded.email) {
      return res.status(403).send({ message: "forbidden access" });
    }
    const query = { email: email };
    const user = await userCollection.findOne(query);
    let student = false;
    if (user) {
      student = user.role === "student";
    }
    res.send({ student });
  });



  
app.patch("/users/admin/:id", verifyToken,  async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updatedDoc = {
    $set: {
      role: "admin",
    },
  };

  const result = await userCollection.updateOne(filter, updatedDoc);
  res.send(result);
});

app.delete("/users/:id", verifyToken,  async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await userCollection.deleteOne(query);
  res.send(result);
});


//All about teacher request collection 

//saving request for teacher role
app.post("/teacherRequest", async (req, res) => {
  const request  = req.body;
  const reqResult = await teacherRequestCollection.insertOne(request);

  console.log("req info ", request);
  res.send({ reqResult }); 
});

//getting requests for admin to approve or delete

app.get("/teacherRequest",   async (req, res) => {
  // console.log(req.headers);
  const result = await teacherRequestCollection.find().toArray();
  res.send(result);
});


//changing the role & status from student to teacher & accepted when admin clicks on the approve button
app.patch("/users/teacher/:id", verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updatedDoc = {
    $set: {
      role: "teacher",
      status: 'accepted'
    },
  };

  const result = await teacherRequestCollection.updateOne(filter, updatedDoc);
  res.send(result);
});




//changing the status from pending to rejected when admin clicks on the reject button
app.patch("/users/teacherReject/:id", verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updatedDoc = {
    $set: {
      // role: "teacher",
      status: 'rejected'
    },
  };

  const result = await teacherRequestCollection.updateOne(filter, updatedDoc);
  res.send(result);
});


//adding the status:rejected in users main collection when admin clicks on the reject button
app.patch("/users/rejectReq/:email", verifyToken, verifyAdmin, async (req, res) => {
  const email = req.params.email;
  const filter = { email:email };
  const updatedDoc = {
    $set: {
      // role: "teacher",
      status: 'rejected'
    },
  };

  const result = await userCollection.updateOne(filter, updatedDoc);
  res.send(result);
});

//changing the role in main usersCollection from student to teacher when the admin approves
app.patch("/users/madeTeacher/:email", verifyToken, verifyAdmin, async (req, res) => {
  const email = req.params.email;
  console.log(email);
  const filter = { email: email };
  const updatedDoc = {
    $set: {
      role: "teacher",
    },
  };

  const result = await userCollection.updateOne(filter, updatedDoc);
  res.send(result);
});

//data for requester to be a teacher 
app.get("/beTeacher/:email",  async (req, res) => {
  const email = req.params.email;
  console.log(email);
 
  const query = { email: email };
  const user = await userCollection.findOne(query);
  
  res.send(user);
});

//teacher adding class which will be approved or rejected by the admin
app.post("/pendingClasses", async (req, res) => {
  const RequestedClass = req.body;
  console.log(RequestedClass);
  const result = await pendingClassRequestCollection.insertOne(RequestedClass);

  console.log("RequestedClass info ", result);
  res.send(result); 
});

//all pending classes for admin's all classes page
app.get("/pendingClasses", verifyToken, verifyAdmin,  async (req, res) => {
  // console.log(req.headers);
  const result = await pendingClassRequestCollection.find().toArray();
  res.send(result);
});


//updating status of the class when admin approves it in pendingRequestCollection  
app.patch("/approveClass/:id", verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id; 
  const filter = {_id: new ObjectId(id)}; 
  const updatedDoc = {
    $set: {
      status: "accepted",
    },
  };

  const result = await pendingClassRequestCollection.updateOne(filter, updatedDoc);
  res.send(result);
});

app.post('/addClassToAllClasses', verifyToken ,verifyAdmin , async(req,res )=> {
const addClassForm = req.body
console.log(addClassForm);
const result = await AllClassesCollection.insertOne(addClassForm)
console.log('added' , result);
res.send(result)

})





//teacher is getting all his pending classes 
 
app.get("/myPendingClasses/:email", verifyToken, async (req, res) => {
  const query = { email: req?.params?.email };
  if (req.params.email !== req?.decoded?.email) {
    return res.status(403).send({ message: "forbidden access" });
  }
  const result = await pendingClassRequestCollection.find(query).toArray();
  res.send(result);
});

//getting specific data for teacher to use in the update form
app.get("/myPendingClass/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await pendingClassRequestCollection.findOne(query);
  if (result) {
        res.send(result);
  } else {
    res.status(404).json({ message: "class not found" });
  }
});








// let teacher delete any of his class
app.delete("/deleteClass/:id", verifyToken,  async (req, res) => {
  const id = req.params.id;
  console.log('466 nmbr', id);
  const query = { _id: new ObjectId(id) };
  console.log('468 nmbr',query);
  const result = await pendingClassRequestCollection.deleteOne(query);
  res.send(result);
});
app.delete("/deleteFromAllClass/:id", verifyToken,  async (req, res) => {
  const id = req.params.id;
  console.log('474 nmbr',id);
  const query = {classId: id };
  console.log('476 nmbr',query);
  const result = await AllClassesCollection.deleteOne(query);
  res.send(result);
});






//changing the status from pending to rejected when admin clicks on the reject button
app.patch("/pendingClasses/:id", verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updatedDoc = {
    $set: { 
      status: 'rejected'
    },
  };

  const result = await pendingClassRequestCollection.updateOne(filter, updatedDoc);
  res.send(result);
});
//updating data in pendingClassCollection if teacher updates the class

app.patch("/updateClass/:id", verifyToken,  async (req, res) => {
  const id = req.params.id;
  console.log(id);
  const filter = { _id: new ObjectId(id) };
  const query = req.body
  console.log(query);
  const updatedDoc = {
    $set: { 
      // name: query.name,
      // photoURL: data.photoURL,
      title: query.title,
      price: query.price,
      description: query.description,
      // status: "pending",
      image: query.image,
      email: query?.email,
    },
  };

  const result = await pendingClassRequestCollection.updateOne(filter, updatedDoc);
  res.send(result);
});

//updating data in AllClassesCollection if teacher updates the class
app.patch("/updateClassInAllClasses/:id", verifyToken,  async (req, res) => {
  const id = req.params.id;
  console.log(id);
  const filter = { classId: id };
  const query = req.body
  console.log(query);
  const updatedDoc = {
    $set: { 
      // name: query.name,
      // photoURL: data.photoURL,
      Title: query.title,
      Price: query.price,
      ShortDescription: query.description,
      // status: "pending",
      image: query.image,
      email: query?.email,
    },
  };

  const result = await AllClassesCollection.updateOne(filter, updatedDoc);
  res.send(result);
});

//teacher's adding assignment to the assignmentCollection
app.post('/addAssignment' , async(req,res) => {
const addAssignment = req.body
console.log(addAssignment);
const result = await assignmentCollection.insertOne(addAssignment)
console.log('added' , result);
res.send(result)

})

//student is getting assignment's which were added by teacher
app.get('/assignments', async (req, res) => {
  const className  = req.query;
console.log(className);
console.log("from 572 ",className);

    
    const assignments = await assignmentCollection.find(className).toArray();
console.log(assignments);
    res.send(assignments);
 
});


//student is submitting assignment 
app.post("/submitAssignment", async (req, res) => {
  const assignment = req.body;
  const result = await submittedAssignmentCollection.insertOne(assignment);

  console.log("result info ", result);
  res.send({ result }); 
});





//getting the number how many assignment was submitted today by name
app.get('/assignments/submissions-count/:className', async (req, res) => {
  try {
    const { className } = req.params;
   
    const today = new Date(); // This gives you the current date and time
const dateOnly = today.toISOString().split('T')[0]; // Extracts only the date part (YYYY-MM-DD)
// console.log(dateOnly); // Outputs: '2023-11-28'
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0); // Start of the day
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59); // End of the day
// console.log(today ,startOfDay ,endOfDay);
    const count = await submittedAssignmentCollection.countDocuments({
      className,
      date: dateOnly
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//counting the total enrollment from payment&pendingCollection 
app.get('/totalEnrollment/:className' , async(req,res) =>{
  try {
    const { className } = req.params;
    const count = await paymentCollection.countDocuments({
      className
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



//counting the total assignment from assignmentCollection 
app.get('/totalAssignments/:className' , async(req,res) =>{
  try {
    const { className } = req.params;
    const count = await assignmentCollection.countDocuments({
      className
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//searching user from all user's page 
// API to search users by username/email
app.get("/users/search", verifyToken, verifyAdmin, async (req, res) => {
  const { searchTerm } = req.query;
  const query = {
    $or: [
      { name: { $regex: new RegExp(searchTerm, "i") } }, // Case-insensitive search for name
      { email: { $regex: new RegExp(searchTerm, "i") } }, // Case-insensitive search for email
    ],
  };

  try {
    const searchResult = await userCollection.find(query).toArray();
    res.json(searchResult);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});







//getting data for teacher when he giving assignment so that we can also send the className
app.get("/myClassForAssignment/:id", async (req, res) => {
  const id = req.params.id;
  // console.log(id);
  const query = { _id: new ObjectId(id) };

  const result = await pendingClassRequestCollection.findOne(query);

  // Check if the result exists
  if (result) {
        res.send(result);
    
  } else {
    res.status(404).json({ message: "class not found" });
  }
});
 
//add review as a student
app.post("/addReview", async (req, res) => {
  const review = req.body;
  const reviewResult = await reviewCollection.insertOne(review);

  console.log("Review info ", reviewResult);
  res.send({ reviewResult }); 
});


//getting review to show on the homepage
app.get('/allReviews' ,async(req,res) =>  {
  const className = req.params;
  // const query = {className: className };
  const result = await reviewCollection.find(className).toArray()
  res.send(result);
})

//getting data of all classes collection to get the name & search in reviewCollection with that name
app.get("/getDataForReview/:id",   async (req, res) => {
  const id = req.params.id;
  const query = {classId: id };
  const result = await AllClassesCollection.findOne(query)
  res.send(result);
});






//getting review for the class with name which we got last api
app.get("/reviews/:name", async (req, res) => {
  const className = req.params.name; // Use req.params.name to get the parameter value
  const query = { className: className };
  const result = await reviewCollection.find(query).toArray();
  res.send(result);
});









//student's enrolled class api
app.get("/enrolledClasses/:email", verifyToken, async (req, res) => {
  const email = req.params.email;
  console.log(email);
 
  const query = { email: email };
  const user = await paymentCollection.find(query);
  
  res.send(user);
});







// getting data for home page highlightedClassSection with sorting by totalEnrollment
app.get("/highlightedClasses", async (req, res) => {
  const limit = Number(4);

    const result = await AllClassesCollection
      .find()
      .sort({ TotalEnrollment: -1 }) 
      .limit(limit)
      .toArray();
  
    res.send(result);
  });












app.get('/' , (req,res) => {
    res.send('server working')
})

app.listen(port , () => {
    console.log(`Server is running on port ${port}`)
})