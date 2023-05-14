require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.port || 4000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.USER_ID}:${process.env.USER_KEY}@cluster0.d2cwisz.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyJWT = async (req, res, next) => {
  const authorization = req.headers.authorization;
  const errorMessage = { error: true, message: "unauthorize access" };
  if (!authorization) {
    return res.status(401).send(errorMessage);
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.PRIVATE_KEY, (error, decoded) => {
    if (error) {
      return res.status(403).send(errorMessage);
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    await client.connect();

    await client.db("admin").command({ ping: 1 });
    console.log("You successfully connected to MongoDB!");

    const treatmentCollection = client.db("doctorDB").collection("treatments");
    const appointmentsCollection = client
      .db("doctorDB")
      .collection("appointments");

    app.post("/jwt", (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.PRIVATE_KEY, {
        expiresIn: "24h",
      });

      res.send({ token });
    });

    app.get("/treatments", async (req, res) => {
      const cursor = treatmentCollection.find();
      const data = await cursor.toArray();
      res.send(data);
    });

    app.post("/appointments", async (req, res) => {
      const data = req.body;
      const result = await appointmentsCollection.insertOne(data);
      res.send(result);
    });

    app.get("/appointments", verifyJWT, async (req, res) => {
      const decoded = req.decoded;
      const email = req.query.email;

      if (email !== decoded.email) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }

      let query = {};
      if (email) {
        query = { email: email };
      }

      const cursor = appointmentsCollection.find(query);
      // const token = req.headers.authorization;
      //  console.log(token);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.delete("/appointments/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await appointmentsCollection.deleteOne(query);
      res.send(result);
    });
    app.patch("/appointments/:id", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const query = { _id: new ObjectId(id) };
      const updatedData = {
        $set: {
          status: status,
        },
      };
      const result = await appointmentsCollection.updateOne(query, updatedData);
      res.send(result);
    });
  } catch (error) {
    console.log(error.message);
  }
}

run();

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
