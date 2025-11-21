const prisma = require("../prisma");
const axios = require("axios");

const { normalizeUrl, ensureClubUrlIsUnique } = require("../helpers");

const IRISH_BASE_URL = "https://weblet.azolve.com/Gateway/ExecuteCommand/";

const irelandScrapper = async () => {
    try {
        const response = await axios.post(
            "https://weblet.azolve.com/Gateway/ExecuteCommand",
            "commands=ZLjaf7xS0TXyfQqLtUKUyUtdRwusFrke9R8ausTNbzOxfdo4wm5rYlQK%2FX41%2Bang057z99HyHTAOhmFi7jxeLoFcojiqZrqlb8fQSRL5qS46yvK7kRIekaivv6JmZlfWCNF5zwsyyghqZNPTswAO0jj08soBq3b9DRCAU%2BUscDaZ3rIP6EmawzQ2%2F2UGGIQWKm%2FF5O%2BMbKtOBjFB6zGWZg%3D%3D",
            {
                headers: {
                    accept: "*/*",
                    "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
                    "content-type": "application/x-www-form-urlencoded",
                    priority: "u=1, i",
                    "sec-ch-ua":
                        '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": '"macOS"',
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "cross-site",
                    Referer: "https://tabletennisireland.ie/",
                },
            }
        );
        const b64 = response.data.payload;
        const decoded = Buffer.from(b64, "base64").toString("utf8");
        const jsonStr = decoded.replace(/^nopeeking/, "");
        const obj = JSON.parse(jsonStr);
        const clubs = obj[0].Result;
        console.log(clubs);

        let counter = 0;
        const totalResult = clubs.length;
        console.log("Total in queue:", totalResult);

        for (const club of clubs) {
            const clubUrl = IRISH_BASE_URL + club?.ClubDocId;
            const alreadyExists = await ensureClubUrlIsUnique(prisma, clubUrl);
            //! Check if already exist
            if (alreadyExists) {
                console.log("Skip existing club", club?.ClubName);
                counter++;
                console.log("Steel in queue", totalResult - counter);
                console.log("------------------------------------------");
                continue;
            }

            //! address
            const addressParts = [
                club?.ClubaddressLine1,
                club?.ClubaddressLine2,
                club?.ClubaddressLine3,
                club?.Clubpostcode,
                club?.Region,
            ];
            const address = addressParts.filter(Boolean).join(", ");

            const descriptionsParts = {
                ClubType: club?.ClubType,
                Facebook: club?.Facebook,
            };
            const description = Object.entries(descriptionsParts)
                .filter(([_, value]) => value) // тільки ті, що мають значення
                .map(([key, value]) => `${key}: ${value}`)
                .join(", ");

            //! Saving club to Db
            const createdClub = await prisma.club.create({
                data: {
                    name: club?.ClubName,
                    country: club?.ClubCountry || "Ireland",
                    city: club?.Clubtown || "",
                    address,
                    postalCode: club?.Clubpostcode,
                    phone: club?.ClubPhoneNumber,
                    email: club?.ClubemailAddress,
                    website: normalizeUrl(club?.Clubwebsite),
                    description,
                    contactFirstName: null,
                    contactLastName: null,
                    url: clubUrl,

                    location: "", //TODO Ask about!

                    locations: {
                        create: {
                            locationName: club?.ClubaddressLine1,
                            address,
                            city: club?.Clubtown || "",
                            postalCode: club?.Clubpostcode,
                            phone: club?.ClubPhoneNumber,
                            email: club?.ClubemailAddress,
                            description,
                            isPrimary: true,
                            displayOrder: 0,
                            countryId: null, //TODO Ask about!
                        },
                    },
                },
            });
            console.log("Created club:", createdClub.id, createdClub.name);

            counter++;
            console.log("Steel in queue", clubs.length - counter);
            console.log("------------------------------------------");
        }
    } catch (error) {
        console.log("Ireland scrapping error:", error);
    }
};
module.exports = irelandScrapper;
