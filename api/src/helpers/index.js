const axios = require("axios");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.1 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
};

const getReq = async (url, options = {}) => {
    const { retries = 3, delayMs = 1000 } = options;

    let attempt = 0;
    while (attempt <= retries) {
        try {
            const res = await axios.get(url, {
                headers: HEADERS,
            });
            if (res?.data) return res.data;
            throw new Error("Empty response body");
        } catch (error) {
            if (attempt === retries) throw error;
            attempt += 1;
            await sleep(delayMs * attempt);
        }
    }
};

const ensureClubUrlIsUnique = async (prismaClient, url) => {
    if (!url) {
        throw new Error("Club URL is required for uniqueness check");
    }

    return prismaClient.club.findUnique({
        where: { url },
        select: { id: true },
    });
};

const normalizeUrl = (url) => {
    if (!url || typeof url !== "string") return null;

    let clean = url.trim();
    clean = clean.replace(/^https?:\/\//i, "");
    clean = clean.replace(/\/+$/, "/");

    return clean;
};

module.exports = {
    sleep,
    getReq,
    ensureClubUrlIsUnique,
    normalizeUrl,
};
