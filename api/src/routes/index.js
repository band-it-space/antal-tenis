const router = require("express").Router();

router.use("/scrapers", require("./scrappers.js"));

module.exports = router;
