const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());
const cheerio = require("cheerio");

const prisma = require("../prisma");

const {
    normalizeUrl,
    sleep,
    getReq,
    ensureClubUrlIsUnique,
} = require("../helpers");

const USA_BASE_URL = "https://usatt.simplycompete.com";
const USA_BASE_URL_ITEM = "https://usatt.simplycompete.com/c/cp?id=253";

const perPage = 100;
const fields = {
    "Club Admin:": "clubInfo",
    "Hours and dates:": "hours",
    "Venue Name:": "venueName",
    "Address Line 1:": "address1",
    "Address Line 2:": "address2",
    "City:": "city",
    "Region:": "region",
    "State:": "state",
    "Zip Code:": "zip",
};
const usaScrapper = async () => {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: "/usr/bin/chromium",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
                "AppleWebKit/537.36 (KHTML, like Gecko) " +
                "Chrome/140.0.0.0 Safari/537.36"
        );

        await page.goto(
            "https://usatt.simplycompete.com/c/d?max=100&v=l&offset=0",
            {
                waitUntil: "networkidle2",
            }
        );

        const clubs = [];
        let offset = 0;

        while (true) {
            try {
                const url = `${USA_BASE_URL}/c/d?max=${perPage}&v=l&offset=${offset}`;
                console.log(`Loading page: ${url}`);
                await page.goto(url, { waitUntil: "networkidle2" });

                const html = await page.content();
                const $ = cheerio.load(html);

                const rows = $("tr.list-item");
                if (rows.length === 0) break;
                rows.each(async (i, row) => {
                    const tds = $(row).find("td.list-column");
                    const name = $(tds[0]).text().trim();
                    const email = $(tds[2]).text().trim() || null;
                    const phone = $(tds[3]).text().trim() || null;

                    const onclick = $(row).attr("onclick");
                    let url = null;
                    if (onclick) {
                        const match = onclick.match(
                            /location\.href\s*=\s*'(.*?)'/
                        );
                        if (match) {
                            url =
                                USA_BASE_URL + match[1].replace(/&amp;/g, "&");
                        }
                    }

                    const alreadyExists = await ensureClubUrlIsUnique(
                        prisma,
                        url
                    );

                    // Check if already exist
                    if (!alreadyExists) {
                        clubs.push({ name, email, phone, url });
                    }
                });
                offset += perPage;
                await sleep(200);
            } catch (error) {
                console.log("USA scrapping error:", error);
                break;
            }
        }
        const newC = clubs.slice(0, 1);
        for (const [index, club] of newC.entries()) {
            if (!club.url) {
                console.log(`Skipping club without url: ${club.name}`);
                continue;
            }
            console.log(`Parsing club with url: ${club.url}`);

            await page.goto(club.url, {
                waitUntil: "networkidle2",
            });

            try {
                await page.goto(club.url, { waitUntil: "networkidle2" });
                const clubHtml = await page.content();
                const $ = cheerio.load(clubHtml);
                const $basic = $("#basic-info");
                const clubInfo = {};

                $basic.find(".row").each((i, el) => {
                    const label = $(el).find(".col.s6.m3").text().trim();
                    const value = $(el).find(".col.s6.m9").text().trim();

                    if (fields[label]) {
                        clubInfo[fields[label]] = value;
                    }
                });
                //! address
                const address = `${clubInfo.address1 || ""} ${
                    clubInfo.address2 || ""
                }`.trim();
                //! postalCode
                const postalCode = clubInfo.zip || null;
                //! contactName
                let contactFirstName = null;
                let contactLastName = null;
                if (clubInfo.contactName) {
                    const [first, ...rest] = clubInfo.admin.split(" ");
                    contactFirstName = first || null;
                    contactLastName = rest.join(" ") || null;
                }
                clubs[index].locationName = clubInfo.venueName || null;
                clubs[index].postalCode = postalCode;
                clubs[index].country = "USA";
                clubs[index].website = null;

                //! description
                if (clubInfo.hours)
                    clubs[index].description = clubInfo.hours || null;

                const createdClub = await prisma.club.create({
                    data: {
                        name: clubs[index].name,
                        country: "USA",
                        city: clubInfo.city || " ",
                        address,
                        postalCode,
                        phone: clubs[index].phone,
                        email: clubs[index].email,
                        website: clubs[index].url,
                        description,
                        contactFirstName,
                        contactLastName,
                        url: clubs[index].url,

                        location: "", //TODO Ask about!

                        locations: {
                            create: {
                                locationName: club?.addr_1 || " ",
                                address,
                                city: club?.addr_city,
                                postalCode: club?.addr_postcode,
                                phone,
                                email,
                                description: null,
                                isPrimary: true,
                                displayOrder: 0,
                                countryId: null, //TODO Ask about!
                            },
                        },
                    },
                });

                console.log("Steel in USA queue", clubs.length - index);
                console.log("------------------------------------------");
                await sleep(200);
            } catch (error) {
                console.log("USA single page error:", club.url, error);
            }
        }
        console.log(clubs);
        console.log("Clubs collected:", clubs.length);
    } catch (error) {
        console.log("USA scrapping error:", error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

module.exports = usaScrapper;
