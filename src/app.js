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

const db = null;
const client = new MongoClient(process.env.DB_URL);

client
    .connect()
    .then(() => {
        db = client.db("uol_api");
    })
    .catch((err) => {
        console.log(err);
    });

const userSchema = Joi.object({
    name: Joi.string().min(1).max(30).required(),
});

const nameSchema = Joi.object({
    name: Joi.string().min(1).max(30).required(),
});

app.post("/participants", async (req, res) => {
    const { name } = req.body;

    try {
        await userSchema.validateAsync(name, { abortEarly: false });

        await db.findOne({ name }, (result) => {
            if (result) {
                throw new Error("User already exists");
            }
        });

        await db
            .collection("partipants")
            .insertOne({ name, lastStatus: Date.now() });
        await db.collection("messages").insertOne({
            from: name,
            to: "Todos",
            text: "entra na sala...",
            type: "status",
            time: dayjs().format("HH:mm:ss"),
        });

        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        if (err.name === "ValidationError") {
            res.status(422).send(err.details.map((detail) => detail.message));
            return;
        } else if (err.message === "User already exists") {
            res.status(409).send(err.message);
            return;
        }
        res.sendStatus(500);
    }
});

app.get("/participants", async (req, res) => {
    try {
        const partipants = await db.collection("partipants").find().toArray();

        res.send(partipants);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

app.post("/messages", async (req, res) => {
    const { to, text, type } = req.body;
    const { user: from } = req.headers;

    try {
        await db.collection("messages").insertOne({
            from,
            to,
            text,
            type,
            time: dayjs().format("HH:mm:ss"),
        });

        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        res.sendStatus(409);
    }
});

app.get("/messages", async (req, res) => {
    const { user } = req.headers;
    const { limit } = req.query;

    try {
        const messages = await db
            .collection("messages")
            .find({ $or: [{ from: user }, { to: user }, { to: "Todos" }] })
            .sort({ _id: -1 })
            .limit(limit ? parseInt(limit) : 0)
            .toArray();

        res.send(messages);
    } catch (err) {
        console.log(err);
        res.sendStatus(409);
    }
});

app.post("/status", async (req, res) => {
    const { user } = req.headers;

    try {
        await db
            .collection("partipants")
            .updateOne({ name: user }, { $set: { lastStatus: Date.now() } });

        res.sendStatus(200);
    } catch (err) {
        console.log(err);
        res.sendStatus(404);
    }
});

app.listen(5000, () => {
    console.log("Server is running on port 5000");
});
