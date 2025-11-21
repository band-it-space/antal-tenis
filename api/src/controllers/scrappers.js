const scrappers = require("../scrappers");

const scrappersController = async (req, res, next) => {
    try {
        const { country } = req.query;

        //! Run scrappers for all countries
        if (!country) {
            Object.keys(scrappers).forEach((key) => {
                scrappers[key]();
            });
            return res.status(200).json({
                message: `Start scrapping for all countries`,
            });
        }

        if (!scrappers[country]) {
            return res.status(400).json({
                message: `There isn't any scraper for ${country}`,
            });
        }

        //! Run scrapper for one country

        scrappers[country]();

        return res.status(200).json({
            message: `Scraper for ${country} started`,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { scrappersController };
