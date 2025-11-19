const {
    germanyScrapper,
    englandScrapper,
    switzerlandScrapper,
} = require("../scrappers");

const scrappersController = async (req, res, next) => {
    try {
        const { country } = req.body;
        if (!country) {
            return res.status(200).json({
                message: `Missed required field!`,
            });
        }
        switch (country) {
            case "germany":
                germanyScrapper();
                break;
            case "england":
                englandScrapper();
                break;
            case "switzerland":
                switzerlandScrapper();
                break;
            default:
                return res.status(200).json({
                    message: `There isn't any scraper for ${country}`,
                });
                break;
        }

        return res.status(200).json({
            message: `Scraper for ${country} started`,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { scrappersController };
