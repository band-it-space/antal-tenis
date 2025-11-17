const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use("/api", require("./routes/index"));

app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

app.listen(port, () => {
    console.log(`API listening on port ${port}`);
});
