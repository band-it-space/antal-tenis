const router = require("express").Router();
const { germanyController } = require("../controllers/germany");

router.get("/germany", germanyController);

module.exports = router;
