import express, { json } from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import cors from "cors";
import Joi from "joi";
import dayjs from "dayjs";

dotenv.config();

const app = express();
app.use(json());
app.use(cors());

const client = new MongoClient(process.env.DB_URL);

const nameFormat = Joi.object({
    name: Joi.string()
        .min(1)
        .max(30)
        .required()
});

app.post("/participants", async (req, res) => {
    const { name } = req.body;
    try {
        await client.connect();

        const dbPartipants = client.db("partipants");
        await dbPartipants.collection("partipants").insertOne({ name , lastStatus: Date.now() });
        
        const dbMessages = client.db("messages");
        await dbMessages.collection("messages").insertOne({ from: name, to: "Todos", text: "entra na sala...", type: "status", time: dayjs().format("HH:mm:ss") });

        res.sendStatus(201);
        client.close();
    } catch (error) {
        console.log(error);
        res.sendStatus(409);
        client.close();
    }
});

app.get("/participants", async (req, res) => {
    try {
        await client.connect();

        const dbPartipants = client.db("partipants");
        const partipants = await dbPartipants.collection("partipants").find().toArray();

        res.send(partipants);
        client.close();
    } catch (error) {
        console.log(error);
        res.sendStatus(409);
        client.close();
    }
});

app.post("/messages", (req, res) => {
    const { message } = req.body;
    res.sendStatus(200);
});

app.get("/messages", (req, res) => {
    res.sendStatus(200);
});

app.post("status", (req, res) => {
    const { status } = req.body;
    res.sendStatus(200);
});

app.listen(5000, () => {
    console.log("Server is running on port 5000");
});
