const prisma = require("../prisma");
const axios = require("axios");

const { sleep, ensureClubUrlIsUnique } = require("../helpers");

const WALES_BASE_URL =
    "https://tabletenniswales.sport80.com/api/public/widget/data/new/1";
const perPage = 100;

const walesScrapper = async () => {
    try {
        let counter = 0;
        let page = 0;

        while (true) {
            try {
                const res = await axios.post(
                    `${WALES_BASE_URL}?p=${page}&i=${perPage}&s=&l=&d=`
                );
                if (!res.data || res.data?.data.length === 0) return;
                const walesData = res.data;
                const totalResult = walesData?.total;
                console.log("Total in queue:", totalResult);

                for (const club of walesData.data) {
                    const clubUrl = WALES_BASE_URL + club?.id;
                    const alreadyExists = await ensureClubUrlIsUnique(
                        prisma,
                        clubUrl
                    );
                    //! Check if already exist
                    if (alreadyExists) {
                        console.log("Skip existing club", club?.name);
                        counter++;
                        console.log("Steel in queue", totalResult - counter);
                        console.log(
                            "------------------------------------------"
                        );
                        continue;
                    }
                    //! address
                    let locationName = "";
                    let city = "";
                    let postalCode = "";

                    if (club?.address) {
                        const addressDetails = club.address
                            .split(",")
                            .map((i) => i.trim());

                        locationName = addressDetails[0] || "";
                        city = addressDetails[addressDetails.length - 4] || "";
                        postalCode =
                            addressDetails[addressDetails.length - 1] || "";
                    }
                    //!description
                    const description = club?.info.reduce(
                        (acc, { title, value }) => {
                            const val = value?.text || value;
                            return acc
                                ? `${acc}; ${title}: ${val}`
                                : `${title}: ${val}`;
                        },
                        ""
                    );

                    const createdClub = await prisma.club.create({
                        data: {
                            name: club?.name,
                            country: "Wales",
                            city,
                            address: club?.address || " ",
                            postalCode,
                            phone: club?.telephone,
                            email: club?.email,
                            website: null,
                            description,
                            contactFirstName: null,
                            contactLastName: null,
                            url: clubUrl,

                            location: "", //TODO Ask about!

                            locations: {
                                create: {
                                    locationName,
                                    address: club?.address || " ",
                                    city,
                                    postalCode,
                                    phone: club?.telephone,
                                    email: club?.email,
                                    description,
                                    isPrimary: true,
                                    displayOrder: 0,
                                    countryId: null, //TODO Ask about!
                                },
                            },
                        },
                    });

                    console.log(
                        "Created club:",
                        createdClub.id,
                        createdClub.name
                    );

                    counter++;
                    page++;
                    console.log("Steel in queue", totalResult - counter);
                    console.log("------------------------------------------");
                    if (totalResult === counter) return;
                }
            } catch (error) {
                console.log("Wales scrapping error:", error);
            }
        }

        // for (const club of engTeams) {
        //     try {
        //         const clubUrl = ENG_BASE_URL + club?.cid;
        //         const alreadyExists = await ensureClubUrlIsUnique(
        //             prisma,
        //             clubUrl
        //         );

        //         // Check if already exist
        //         if (alreadyExists) {
        //             console.log("Skip existing club", club?.name);
        //             counter++;
        //             console.log("Steel in queue", engTeams.length - counter);
        //             console.log("------------------------------------------");
        //             continue;
        //         }
        //         const addressParts = [
        //             club?.addr_1,
        //             club?.addr_2,
        //             club?.addr_3,
        //             club?.addr_postcode,
        //         ];
        //         const address = addressParts.filter(Boolean).join(", ");
        //         const phone = club?.number
        //             ? club?.number
        //             : club?.primary_tel
        //             ? club?.primary_tel
        //             : club?.primary_secondary_tel
        //             ? club?.primary_secondary_tel
        //             : null;
        //         const email = club?.email ? club?.email : null;

        //         // Saving club to Db
        //         const createdClub = await prisma.club.create({
        //             data: {
        //                 name: club?.name,
        //                 country: club?.addr_country || "England",
        //                 city: club?.addr_city || " ",
        //                 address,
        //                 postalCode: club?.addr_postcode,
        //                 phone,
        //                 email,
        //                 website: club?.url ? club?.url : null,
        //                 description: null,
        //                 contactFirstName: club?.primary_fname,
        //                 contactLastName: club?.primary_lname,
        //                 url: clubUrl,

        //                 location: "", //TODO Ask about!

        //                 locations: {
        //                     create: {
        //                         locationName: club?.addr_1 || " ",
        //                         address,
        //                         city: club?.addr_city,
        //                         postalCode: club?.addr_postcode,
        //                         phone,
        //                         email,
        //                         description: null,
        //                         isPrimary: true,
        //                         displayOrder: 0,
        //                         countryId: null, //TODO Ask about!
        //                     },
        //                 },
        //             },
        //         });

        //         console.log("Created club:", createdClub.id, createdClub.name);

        //         counter++;
        //         console.log("Steel in queue", engTeams.length - counter);
        //         console.log("------------------------------------------");
        //     } catch (error) {
        //         console.log("Error while saving club:", club.cid);
        //         console.log("------------------------------------------");
        //     }
        // }
    } catch (error) {
        console.log("England scrapping error:", error);
    }
};
module.exports = walesScrapper;
