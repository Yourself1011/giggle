import { Prisma } from "@prisma/client";
import { parse } from "./robots";
import { prisma } from "@/prisma";

const userAgentToken = "GiggleBot";
const damping = 0.85;
export default function start(rootURL: URL) {
    search(rootURL);
}

async function search(url: URL) {
    console.log("crawling " + url.href);
    let toAdd: Prisma.SiteCreateInput = { url: url.href, pageRank: 0 };

    if (url.pathname == "/") {
        const robots = await parse(url, userAgentToken);
        if (robots?.sitemap) {
            const sitemapRaw = await fetch(robots.sitemap);
            const sitemap = (await sitemapRaw.text()).matchAll(/(?<=<loc>).*(?=<\/loc>)/g);

            await prisma.site.createMany({
                data: [...sitemap].map((loc) => ({
                    url: loc[0],
                    pageRank: 0,
                })),
            });
        }
    }

    const res = await fetch(url);

    if (res.ok) {
    }
}
