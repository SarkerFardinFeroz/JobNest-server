const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const app = express();
const port = process.env.PORT || 5000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.frd0xwu.mongodb.net/?retryWrites=true&w=majority`;

// middleware
app.use(
  cors({
    origin: [
      // "http://localhost:5173",
      "https://jobnest-1.web.app/",
      "https://jobnest-1.firebaseapp.com/",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middleware

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  // console.log({ token });

  //no token available
  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();
    const categoryCollection = client.db("jobNest").collection("category");
    const jobsCollection = client.db("jobNest").collection("jobs");
    const appliedCollection = client.db("jobNest").collection("appliedJob");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });
    app.post("logout", async (req, res) => {
      const user = req.body;
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    app.get("/applied", verifyToken, async (req, res) => {
      try {
        if (req.query.email !== req.user.email) {
          return res.status(403).send({ message: "forbidden access" });
        }

        const cursor = appliedCollection.find();
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.post("/applied", async (req, res) => {
      try {
        const appliedData = req.body;
        const result = await appliedCollection.insertOne(appliedData);
        res.send(result);
      } catch (error) {
        res.send(error);
      }
    });

    app.put("/apply/:id", async (req, res) => {
      try {
        const body = req.body;
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const update = { $inc: { jobApplicantsNumber: 1 } };
        const options = { upsert: true };
        const result = await jobsCollection.updateOne(filter, update, options);

        res.json(result);
      } catch (error) {
        console.log(error);
        res.send(error);
      }
    });

    app.get("/category", async (req, res) => {
      try {
        const cursor = categoryCollection.find();
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    app.get("/jobs", async (req, res) => {
      try {
        const cursor = jobsCollection.find();
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    app.get("/job-details/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await jobsCollection.findOne(query);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.post("/jobs", async (req, res) => {
      try {
        const body = req.body;
        const result = await jobsCollection.insertOne(body);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // delete job
    app.delete("/jobs/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await jobsCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    // Update job
    app.put("/jobs/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updatedJob = req.body;
        const job = {
          $set: {
            pictureUrl: updatedJob.pictureUrl,
            logoURL: updatedJob.logoURL,
            jobTitle: updatedJob.jobTitle,
            jobLocation: updatedJob.jobLocation,
            authorName: updatedJob.authorName,
            jobCategory: updatedJob.jobCategory,
            minimumSalary: updatedJob.minimumSalary,
            maximumSalary: updatedJob.maximumSalary,
            jobPostingDate: updatedJob.jobPostingDate,
            jobApplicationDeadline: updatedJob.jobApplicationDeadline,
            jobApplicantsNumber: updatedJob.jobApplicantsNumber,
            jobDescription: updatedJob.jobDescription,
          },
        };
        const result = await jobsCollection.updateOne(filter, job, options);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // get my jobs
    app.get("/my-jobs", verifyToken, async (req, res) => {
      try {
        if (req.query.email !== req.user.email) {
          return res.status(403).send({ message: "forbidden access" });
        }

        let query = {};
        if (req.query?.email) {
          query = { email: req.query.email };
        }
        const result = await jobsCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("JobNest server is running");
});

app.listen(port, () => {
  console.log(`JobNest server is running on port : ${port}`);
});
