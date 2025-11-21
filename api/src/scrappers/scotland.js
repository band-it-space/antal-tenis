const cheerio = require("cheerio");

const prisma = require("../prisma");
const { normalizeUrl, getReq, ensureClubUrlIsUnique } = require("../helpers");

const SCOTLAND_BASE_URL = "https://tabletennisscotland.co.uk/places-to-play-2/";
const postcodeFormatRegex = /([A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2})/i;

const scotlandScrapper = async () => {
    try {
        const clubInfoData = await getReq(SCOTLAND_BASE_URL);
        const $ = cheerio.load(clubInfoData);
        const script = $("#frontend\\.gmap-js-extra").html();
        const match = script.match(/var\s+gmpAllMapsInfo\s*=\s*(\[.*?\]);/s);
        if (!match) {
            console.log("Не знайдено gmpAllMapsInfo");
            return;
        }

        const jsonDataText = match[1];
        const clubsInfo = JSON.parse(jsonDataText);
        const clubs = clubsInfo[0].markers;
        console.log("Total clubs:", clubs.length);

        let counter = 0;
        for (const club of clubs) {
            try {
                const clubUrl = SCOTLAND_BASE_URL + club?.id;
                const alreadyExists = await ensureClubUrlIsUnique(
                    prisma,
                    clubUrl
                );

                // Check if already exist
                if (alreadyExists) {
                    console.log("Skip existing club", club?.title);
                    counter++;
                    console.log(
                        "Steel in Scotland queue",
                        clubs.length - counter
                    );
                    console.log("------------------------------------------");
                    continue;
                }
                let city = " ";
                let postalCode = null;
                const match = club?.address.match(postcodeFormatRegex);

                if (match) {
                    postalCode = match[1];
                    const beforePostcode = club?.address
                        .substring(0, match.index)
                        .trim();
                    city = beforePostcode.split(",").pop().trim();
                }
                //! description
                const $desc = cheerio.load(club?.description || "");
                let description = $desc.text().replace(/\s+/g, " ").trim();

                //!email
                const emailMatch = description.match(
                    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
                );
                const email = emailMatch ? emailMatch[0] : null;

                //! phone
                const phoneMatch = description.match(/(\+?\d[\d\s\-()]{7,}\d)/);
                const phone = phoneMatch ? phoneMatch[1] : null;

                //! web
                const websiteMatch = description.match(
                    /(https?:\/\/[^\s]+|www\.[^\s]+)/i
                );
                const website = websiteMatch
                    ? normalizeUrl(websiteMatch[0])
                    : null;

                //! contact name
                let contactFirstName = " ";
                let contactLastName = " ";

                const contactMatch = description.match(
                    /Contact:\s*([A-Za-zÀ-ÖØ-öø-ÿ'’\-]+)\s+([A-Za-zÀ-ÖØ-öø-ÿ'’\-]+)/i
                );
                if (contactMatch) {
                    contactFirstName = contactMatch[1];
                    contactLastName = contactMatch[2];
                }

                //! Saving club to Db
                const createdClub = await prisma.club.create({
                    data: {
                        name: club?.title,
                        country: "Scotland",
                        city,
                        address: club?.address,
                        postalCode,
                        phone,
                        email,
                        website,
                        description: description || null,
                        contactFirstName,
                        contactLastName,
                        url: clubUrl,

                        location: "", //TODO Ask about!

                        locations: {
                            create: {
                                locationName: " ",
                                address: club?.address,
                                city,
                                postalCode,
                                phone,
                                email,
                                description: description || null,
                                isPrimary: true,
                                displayOrder: 0,
                                countryId: null, //TODO Ask about!
                            },
                        },
                    },
                });

                console.log("Created club:", createdClub.id, createdClub.name);

                counter++;
                console.log("Steel in Scotland queue", clubs.length - counter);
                console.log("------------------------------------------");
            } catch (error) {
                console.log(error);

                console.log("Error while saving club:", club.id);
                console.log("------------------------------------------");
            }
        }
    } catch (error) {
        console.log("Error in Scotland scrapper:", error);
    }
};

module.exports = scotlandScrapper;
