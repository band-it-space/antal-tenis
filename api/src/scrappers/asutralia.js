const prisma = require("../prisma");
const cheerio = require("cheerio");
const {
    normalizeUrl,
    getReq,
    ensureClubUrlIsUnique,
    sleep,
} = require("../helpers");

const AUS_BASE_URL = "https://www.itabletennis.com.au";

const australiaTeamsScrapper = async () => {
    try {
        let counter = 0;
        let page = 1;
        const clubs = [];

        while (true) {
            const resHtml = await getReq(
                `${AUS_BASE_URL}/clubs/?page=${page}&state=all`
            );
            const $ = cheerio.load(resHtml);

            const rows = $("div.member-info");
            rows.each((_, row) => {
                const name = $(row).find("h4").text().trim();
                const relativeLink = $(row)
                    .find('a[href^="/clubs/"]')
                    .attr("href");
                if (!relativeLink) return;
                const clubUrl = AUS_BASE_URL + relativeLink;
                clubs.push({
                    name,
                    url: clubUrl,
                });
            });

            const nextPageBtn = $(
                "#PagedList-pagination ul li.PagedList-skipToNext"
            );
            if (nextPageBtn.length === 0) break;
            page++;
        }

        console.log(`Collected clubs: ${clubs.length}`);

        for (const club of clubs) {
            try {
                const alreadyExists = await ensureClubUrlIsUnique(
                    prisma,
                    club.url
                );

                // Check if already exist
                if (alreadyExists) {
                    console.log("Skip existing club", club?.name);
                    counter++;
                    console.log(
                        "Steel in Australia queue",
                        clubs.length - counter
                    );
                    console.log("------------------------------------------");
                    continue;
                }

                const resHtml = await getReq(club.url);
                const $ = cheerio.load(resHtml);

                // logo
                const logoDivStyle =
                    $("div.user-image-background").attr("style") || "";
                const matchLogo = logoDivStyle.match(/url\(['"]?(.*?)['"]?\)/);

                let logoUrl = null;

                if (matchLogo && matchLogo[1]) {
                    logoUrl = "www.itabletennis.com.au" + matchLogo[1];
                }
                const clubInfoBlock = $("div.portfolio-info-inner");

                // city
                let city = " ";
                const shortAddressParts = clubInfoBlock
                    .find(".row")
                    .first()
                    .find("h5")
                    .text()
                    .trim();
                if (shortAddressParts)
                    city = shortAddressParts.split(",").map((i) => i.trim())[1];

                //address
                let address, postalCode;

                const fullAddressStr = $(
                    '.portfolio-info-inner h3:contains("How to find us")'
                )
                    .next("p")
                    .text()
                    .trim();

                if (fullAddressStr) {
                    addressParts = fullAddressStr
                        .split(",")
                        .map((i) => i.trim());
                    address = fullAddressStr;
                    postalCode = addressParts[addressParts.length - 1];
                }
                // Contacts
                const contactBlock = $(".blog-teasers").first();
                let contactFirstName, contactLastName;

                const nameDiv = contactBlock.find(
                    ".blog-teaser:contains('Name:')"
                );
                if (nameDiv.length) {
                    const nameText = nameDiv.text().replace("Name:", "").trim();
                    const nameParts = nameText.split(" ");
                    if (nameParts.length > 2) {
                        contactFirstName = nameText;
                    } else {
                        contactFirstName = nameParts[0] || null;
                        contactLastName = nameParts.slice(1).join(" ") || null;
                    }
                }
                // Email
                const emailLink = contactBlock.find(
                    ".blog-teaser a[href^='mailto:']"
                );
                const email = emailLink.length
                    ? emailLink.attr("href").replace("mailto:", "")
                    : null;

                // Telephone
                const phoneDiv = contactBlock.find(
                    ".blog-teaser:contains('Telephone:')"
                );
                const phone = phoneDiv.length
                    ? phoneDiv.text().replace("Telephone:", "").trim()
                    : null;

                // website
                const onlineBlock = $(".blog-teasers h3:contains('Online')")
                    .nextAll(".blog-teaser")
                    .first();
                let website = null;
                if (onlineBlock.length) {
                    const websiteLink = onlineBlock.find("a[href^='http']");
                    website = websiteLink.length
                        ? websiteLink.attr("href")
                        : null;
                }
                // description
                const aboutBlock = $(".portfolio-info-inner .row").find(
                    ".col-lg-6"
                );

                let description = "";
                aboutBlock.children().each((_, el) => {
                    const tag = el.tagName.toLowerCase();
                    const text = $(el).text().trim();
                    if (!text) return;

                    if (tag === "h3") {
                        description += text + ": ";
                    } else if (tag === "p") {
                        description += text.endsWith(".")
                            ? text + " "
                            : text + ". ";
                    }
                });

                description = description.trim();

                const createdClub = await prisma.club.create({
                    data: {
                        name: club?.name,
                        country: "Australia",
                        city,
                        address,
                        postalCode,
                        phone,
                        email,
                        website: normalizeUrl(website),
                        logoUrl,
                        description,
                        contactFirstName,
                        contactLastName,
                        url: club.url,

                        location: "", //TODO Ask about!

                        locations: {
                            create: {
                                locationName: " ",
                                address,
                                city,
                                postalCode,
                                phone,
                                email,
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
                console.log("Steel in Scotland queue", clubs.length - counter);
                console.log("------------------------------------------");
                await sleep(200);
            } catch (error) {
                console.log("Australia single page error:", club.url, error);
            }
        }
        // const resHtml = await getReq(`,${AUS_BASE_URL}?page=${page}&state=all`);
        // const $ = cheerio.load(resHtml);

        // console.log("Total commands:", engTeams.length);
        // if (!engTeams) return;

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
        //             console.log(
        //                 "Steel in England queue",
        //                 engTeams.length - counter
        //             );
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
        //                 website: normalizeUrl(club?.url),
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
        //         console.log(
        //             "Steel in England queue",
        //             engTeams.length - counter
        //         );
        //         console.log("------------------------------------------");
        //     } catch (error) {
        //         console.log("Error while saving club:", club.cid);
        //         console.log("------------------------------------------");
        //     }
        //}
    } catch (error) {
        console.log("Australia scrapping error:", error);
    }
};
module.exports = australiaTeamsScrapper;
