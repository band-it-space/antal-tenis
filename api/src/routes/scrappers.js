const router = require("express").Router();
const { scrappersController } = require("../controllers/scrappers");

router.post("/", scrappersController);

module.exports = router;
