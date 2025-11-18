const { germanyScrapper } = require("../scrappers");

const germanyController = async (req, res, next) => {
    try {
        germanyScrapper();
        return res.status(200).json({
            message: "Scraper for Germany started",
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { germanyController };
