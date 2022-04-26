import express, { json } from 'express';
import cors from 'cors';

const app = express();
app.use(json());
app.use(cors());

app.post('/partipants', (req, res) => {
    const { name } = req.body;
    app.sendStatus(200);
});

app.get('/partipants', (req, res) => {
    app.sendStatus(200);
});

app.post('/messages', (req, res) => {
    const { message } = req.body;
    app.sendStatus(200);
});

app.get('/messages', (req, res) => {
    app.sendStatus(200);
});

app.post('status', (req, res) => {
    const { status } = req.body;
    app.sendStatus(200);
});


app.listen(5000, () => {
    console.log("Server is running on port 5000")
});
