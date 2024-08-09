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

            prisma.site.createMany({
                data: [...sitemap].map((loc) => ({
                    url: loc[0],
                })),
            });
        }
    }

    const res = await fetch(url);

    if (!res.ok) return;

    const raw = await res.text();

    const rendered = raw; // TODO: run javascript

    // match all urls
    const urls = [
        ...rendered.matchAll(
            /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})|((?<=href=").*(?="))/gm
        ),
    ];

    // const outgoing = await prisma.site.createManyAndReturn({
    //     data: urls.map((url) => ({ url: url[0] })),
    //     skipDuplicates: true,
    // });

    const entry = await prisma.site.create({
        data: {
            url: url.href,
            pageRank: 0,
        },
    });

    const outgoing = await prisma.$transaction(
        urls.map((url) =>
            prisma.site.upsert({
                where: { url: url[0] },
                update: { incomingLinks: { create: [{ incomingUrl: entry.url }] } },
                create: { url: url[0], incomingLinks: { create: [{ incomingUrl: entry.url }] } },
            })
        )
    );

    const textOnly = rendered.replaceAll(/(<.*>)|(<\/.*>)/gm, ""); // remove html tags
}
