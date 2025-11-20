const prisma = require("../prisma");
const { sleep, getReq, ensureClubUrlIsUnique } = require("../helpers");

const ENG_BASE_URL =
    "https://www.tabletennisengland.co.uk/content/json/sport80.json";

const englandTeamsScrapper = async () => {
    try {
        let counter = 0;
        const engTeams = await getReq(ENG_BASE_URL);
        console.log("Total commands:", engTeams.length);
        if (!engTeams) return;

        for (const club of engTeams) {
            try {
                const clubUrl = ENG_BASE_URL + club?.cid;
                const alreadyExists = await ensureClubUrlIsUnique(
                    prisma,
                    clubUrl
                );

                // Check if already exist
                if (alreadyExists) {
                    console.log("Skip existing club", club?.name);
                    counter++;
                    console.log("Steel in queue", engTeams.length - counter);
                    console.log("------------------------------------------");
                    continue;
                }
                const addressParts = [
                    club?.addr_1,
                    club?.addr_2,
                    club?.addr_3,
                    club?.addr_postcode,
                ];
                const address = addressParts.filter(Boolean).join(", ");
                const phone = club?.number
                    ? club?.number
                    : club?.primary_tel
                    ? club?.primary_tel
                    : club?.primary_secondary_tel
                    ? club?.primary_secondary_tel
                    : null;
                const email = club?.email ? club?.email : null;

                // Saving club to Db
                const createdClub = await prisma.club.create({
                    data: {
                        name: club?.name,
                        country: club?.addr_country || "England",
                        city: club?.addr_city || " ",
                        address,
                        postalCode: club?.addr_postcode,
                        phone,
                        email,
                        website: club?.url ? club?.url : null,
                        description: null,
                        contactFirstName: club?.primary_fname,
                        contactLastName: club?.primary_lname,
                        url: clubUrl,

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

                console.log("Created club:", createdClub.id, createdClub.name);

                counter++;
                console.log("Steel in queue", engTeams.length - counter);
                console.log("------------------------------------------");
            } catch (error) {
                console.log("Error while saving club:", club.cid);
                console.log("------------------------------------------");
            }
        }
    } catch (error) {
        console.log("England scrapping error:", error);
    }
};
module.exports = englandTeamsScrapper;
