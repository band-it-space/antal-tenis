const axios = require("axios");
const cheerio = require("cheerio");

const prisma = require("../prisma");
const clubsData = require("./german.json");
const { sleep } = require("../helpers");

const BASE_URL = "https://httv.click-tt.de";

const germanyTeamsScrapper = async (req, res, next) => {
    try {
        const regionLinks = [];
        for (const data of clubsData) {
            const response = await axios.get(data.url, {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.1 Safari/537.36",
                    "Accept-Language": "en-US,en;q=0.9",
                },
            });

            const $ = cheerio.load(response.data);

            $('form[name="f_0_1_63_7"] ul a').each((_, element) => {
                const href = $(element).attr("href");
                // const label = $(element).text().trim();

                if (href) {
                    regionLinks.push({
                        baseUrl: data.url,
                        href,
                    });
                }
            });

            await sleep(200);
            console.log(regionLinks.length);
        }
        console.log(regionLinks.length);

        for (const link of regionLinks) {
        }
        return res.status(200).json({
            message: "Scraper OK",
            data: regionLinks,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { germanyTeamsScrapper };
