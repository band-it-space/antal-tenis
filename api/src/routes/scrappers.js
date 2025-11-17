const router = require("express").Router();
const { germanyTeamsScrapper } = require("../controllers/germany");

router.get("/germany", germanyTeamsScrapper);

module.exports = router;
