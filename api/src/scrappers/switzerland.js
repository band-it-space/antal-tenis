const cheerio = require("cheerio");

const prisma = require("../prisma");
const { sleep, getReq, ensureClubUrlIsUnique } = require("../helpers");

const BASE_URL = "https://www.click-tt.ch";
const clubsData = [
    {
        url: "https://www.click-tt.ch/cgi-bin/WebObjects/nuLigaTTCH.woa/wa/clubSearch?federation=STT",
    },
];
const extractClubInfo = (html) => {
    const $ = cheerio.load(html);

    const root = $("tbody > tr > td").first();

    //! name
    const fullName = $("h1").first().html();

    if (!fullName) {
        console.warn("No <h1> found for URL:", url);
        return { club: null, locations: [] };
    }
    let name = fullName.split("<br>").map((l) => l?.trim())[1];
    //! description
    const infoText = root.find("p").first().text().replace(/\s+/g, " ").trim();

    //! contact info
    const contactBlock = root.find("h2:contains('Contact Address')").next("p");

    const contactRaw = contactBlock.html() || "";
    const contactText = contactBlock.text().trim();

    const contactLines = contactRaw.split("<br>").map((l) => l?.trim());

    const contactFullName = contactLines[0]
        .trim()
        .split(" ")
        .map((l) => l?.trim());
    console.log("contactFullName", contactFullName);

    //! email
    const matches = [
        ...contactRaw.matchAll(
            /encodeEmail\('([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)'\)/g
        ),
    ];
    const emails = matches.map((m) => {
        const [, tld, local, domain, sub] = m;
        return sub
            ? `${local}@${sub}.${domain}.${tld}`
            : `${local}@${domain}.${tld}`;
    });
    //! website
    const websiteEl = contactBlock.find("a[href^='http']").first();
    const website = websiteEl.length ? websiteEl.attr("href").trim() : null;

    //! phone
    const phoneMatch = contactText.match(/Tel.*?\s([\d/ ]+)/i);
    const phone = phoneMatch ? phoneMatch[1].trim() : null;

    const mobileMatch = contactText.match(/Mobil\s+([\d/+()\- ]+)/i);
    const mobile = mobileMatch ? mobileMatch[1].trim() : null;

    //TODO: contact address
    // const addressLine = contactBlock
    //     .html()
    //     ?.split("<br>")[1]
    //     ?.replace(/<[^>]+>/g, "")
    //     .trim();

    // const addressParts = addressLine ? addressLine.split(",") : [];
    // const cityPart = addressParts[1] ? addressParts[1].trim() : null;

    // const postalMatch = cityPart ? cityPart.match(/(\d{4,5})/) : null;
    // const postalCode = postalMatch ? postalMatch[1] : null;

    // const city = cityPart ? cityPart.replace(postalCode, "").trim() : null;

    //! location
    const rightCol = $("tbody > tr > td").eq(1);

    const locations = [];

    rightCol.find("h2").each((_, h2) => {
        const title = $(h2).text().trim();

        if (!title.toLowerCase().includes("matchlocation")) return;
        console.log("Title", title);
        const p = $(h2).next("p");
        const blockText = p.text().trim();

        const lines = blockText.split("\n").map((l) => l.trim());

        const addressLine = lines[1] || "";
        const addressParts = addressLine.split(",");

        let street = " ";
        let city = " ";
        let postalCode = null;

        if (addressParts.length === 1) {
            const postalMatch = addressParts[0]?.trim().match(/(\d{4,5})/);
            postalCode = postalMatch ? postalMatch[1] : null;

            city = postalCode
                ? addressParts[0].replace(postalCode, "").trim()
                : "";
        } else {
            street = addressParts[0]?.trim();
            const cityRaw = addressParts[1]?.trim() || "";

            const postalMatch = cityRaw?.match(/(\d{4,5})/);
            postalCode = postalMatch ? postalMatch[1] : null;

            city = postalCode
                ? cityRaw.replace(postalCode, "").trim()
                : cityRaw;
        }
        const phoneMatch = blockText.match(/Tel.*?\s([\d/ ]+)/i);
        const phone = phoneMatch ? phoneMatch[1].trim() : null;

        locations.push({
            locationName: lines[0],
            address: street,
            city,
            postalCode,
            phone,
        });
    });

    //! club
    const club = {
        name: name,
        country: "Switzerland",
        city: locations[0]?.city || " ",
        address: locations[0]?.address || " ",
        postalCode: locations[0]?.postalCode || " ",
        phone: phone ? phone : mobile ? mobile : " ",
        email: emails[0],
        website,
        location: null,
        firstName: contactFullName.length > 0 ? contactFullName[0] : "",
        lastName: contactFullName.length > 1 ? contactFullName[1] : "",
        description: infoText ? infoText : null,
    };

    return {
        club,
        locations,
    };
};

const switzerlandTeamsScrapper = async () => {
    try {
        const regionLinks = [];
        for (const clubInfo of clubsData) {
            const clubInfoData = await getReq(clubInfo.url);

            const $ = cheerio.load(clubInfoData);

            $('form[name="f_0_1_63_7"] ul a').each((_, element) => {
                const href = $(element).attr("href");
                // const label = $(element).text().trim();

                if (href) {
                    regionLinks.push({
                        href,
                    });
                }
            });

            await sleep(200);
        }
        let regCounter = regionLinks.length;
        console.log("Region links", regCounter);

        const teamLinks = [];
        for (const regionData of regionLinks) {
            const teamInfo = await getReq(BASE_URL + regionData.href);

            const $ = cheerio.load(teamInfo);

            $("td a").each((_, element) => {
                const href = $(element).attr("href");

                if (href) {
                    teamLinks.push({
                        href,
                    });
                }
            });

            await sleep(200);
            console.log("In queue Region`s", regCounter--);
        }
        console.log("Team page links:", teamLinks.length);
        let counter = 0;
        for (const teamPageLink of teamLinks) {
            try {
                const clubUrl = BASE_URL + teamPageLink.href;
                console.log("Start scrapping", clubUrl);

                const alreadyExists = await ensureClubUrlIsUnique(
                    prisma,
                    clubUrl
                );

                if (alreadyExists) {
                    console.log("Skip existing club", clubUrl);
                    counter++;
                    console.log("Steel in queue", teamLinks.length - counter);
                    console.log("------------------------------------------");
                    continue;
                }

                const teamPage = await getReq(clubUrl);
                if (!teamPage) continue;
                const { club, locations } = extractClubInfo(teamPage);

                if (!club || !locations || locations.length === 0) {
                    console.log("Missed required data");

                    counter++;
                    console.log("Steel in queue", teamLinks.length - counter);
                    console.log("------------------------------------------");
                    continue;
                }

                const createdClub = await prisma.club.create({
                    data: {
                        name: club.name,
                        country: club.country,
                        city: club.city,
                        address: club.address,
                        postalCode: club.postalCode,
                        phone: club.phone,
                        email: club.email,
                        website: club.website,
                        description: club.description,
                        contactFirstName: club.firstName,
                        contactLastName: club.lastName,
                        url: clubUrl,

                        location: "", //TODO Ask about!

                        locations: {
                            create: locations.map((loc, index) => ({
                                locationName: loc.locationName,
                                address: loc.address,
                                city: loc.city,
                                postalCode: loc.postalCode,
                                phone: loc.phone,
                                email: null,
                                description: null,
                                isPrimary: index === 0,
                                displayOrder: index,
                                countryId: null, //TODO Ask about!
                            })),
                        },
                    },
                });

                console.log("Created club:", createdClub.id, createdClub.name);

                counter++;
                console.log("Steel in queue", teamLinks.length - counter);
                console.log("------------------------------------------");
                await sleep(200);
            } catch (error) {
                console.log(
                    "Error while scrapping:",
                    BASE_URL + teamPageLink.href
                );
            }
        }
    } catch (err) {
        console.log(err);
    }
};

module.exports = switzerlandTeamsScrapper;
