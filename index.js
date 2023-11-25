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
    // await client.connect();
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














//getting all the class of all teachers
app.get('/all-class' ,async(req,res) =>  {
    const result = await AllClassesCollection.find().toArray()
    res.send(result)
})

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
      const enrollmentCount = await enrollmentCollection.countDocuments();
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
app.get("/users", verifyToken, verifyAdmin,  async (req, res) => {
  // console.log(req.headers);
  const result = await userCollection.find().toArray();
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