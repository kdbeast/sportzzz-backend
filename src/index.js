import express from 'express';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello, this is a simple Express server!');
});

const port = 8000;
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});