const router = require("express").Router();
const { scrappersController } = require("../controllers/scrappers");

router.get("/", scrappersController);

module.exports = router;
