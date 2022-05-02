import { stripHtml } from "string-strip-html";
import express, { json } from "express";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
import cors from "cors";
import Joi from "joi";

dotenv.config();

const app = express();
app.use(json());
app.use(cors());

let db = null;
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
    name: Joi.string().required(),
});

const messageSchema = Joi.object({
    to: Joi.string().required(),
    text: Joi.string().required(),
    type: Joi.string().valid("message", "private_message").required(),
});

app.post("/participants", async (req, res) => {
    const name = stripHtml(req.body.name).result.trim();

    try {
        await userSchema.validateAsync(req.body, { abortEarly: false });

        const document = await db.collection("participants").findOne({ name });
        if (document) {
            throw new Error("User already exists");
        }

        await db
            .collection("participants")
            .insertOne({ name, lastStatus: Date.now() });
        await db.collection("messages").insertOne({
            from: name,
            to: "Todos",
            text: "entra na sala...",
            type: "status",
            time: dayjs().format("HH:mm:ss"),
        });

        res.status(201).send({ name });
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
        const participants = await db
            .collection("participants")
            .find()
            .toArray();

        res.send(participants);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

app.post("/messages", async (req, res) => {
    const { to, text, type } = req.body;
    const { user: from } = req.headers;

    try {
        await messageSchema.validateAsync(req.body, { abortEarly: false });

        const document = await db
            .collection("participants")
            .findOne({ name: from });
        if (!document) {
            throw new Error("User not found");
        }

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
        if (err.name === "ValidationError") {
            res.status(422).send(err.details.map((detail) => detail.message));
            return;
        } else if (err.message === "User not found") {
            res.status(422).send(err.message);
            return;
        }
        res.sendStatus(500);
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

        res.send(messages.reverse());
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

app.post("/status", async (req, res) => {
    const { user } = req.headers;

    try {
        await db
            .collection("participants")
            .updateOne({ name: user }, { $set: { lastStatus: Date.now() } });

        res.sendStatus(200);
    } catch (err) {
        console.log(err);
        res.sendStatus(404);
    }
});

app.delete("/messages/:id", async (req, res) => {
    const { id } = req.params;
    const { user } = req.headers;
    try {
        const message = await db
            .collection("messages")
            .findOne({ _id: new ObjectId(id) });
        if (!message) {
            throw new Error("Message not found");
        }

        if (message.from !== user) {
            throw new Error("You are not allowed to delete this message");
        }

        await db.collection("messages").deleteOne({ _id: new ObjectId(id) });

        res.sendStatus(200);
    } catch (err) {
        console.log(err);
        if (err.message === "Message not found") {
            res.status(404).send(err.message);
            return;
        } else if (
            err.message === "You are not allowed to delete this message"
        ) {
            res.status(401).send(err.message);
            return;
        }
        res.sendStatus(500);
    }
});

app.listen(5000, () => {
    console.log("Server is running on port 5000");
});

async function removeParticipant(name) {
    try {
        await db.collection("participants").deleteOne({ name });
    } catch (err) {
        console.log(err);
    }
}

const autoRemoveInactiveUsers = setInterval(async () => {
    const now = Date.now();
    try {
        const participants = await db
            .collection("participants")
            .find({})
            .toArray();
        participants.forEach((participant) => {
            if (participant.lastStatus + 1000 * 10 < now) {
                removeParticipant(participant.name);
            }
        });
    } catch (err) {
        console.log(err);
    }
}, 15000);
