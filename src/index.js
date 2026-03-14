import express from 'express';
import { matchRouter } from './routes/matches.route.js';

const app = express();

app.use(express.json());

app.use('/matches', matchRouter)

const port = 8000;
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});