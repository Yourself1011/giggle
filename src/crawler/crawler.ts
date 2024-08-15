import { Prisma } from "@prisma/client";
import { check, parse } from "./robots";
import { prisma } from "@/prisma";

const userAgentToken = "GiggleBot";
const limit = 2000;
export default async function start(rootURL: URL) {
    // search(rootURL);
    await prisma.site.create({
        data: {
            url: rootURL.href,
        },
    });

    while (true) {
        const entry = await prisma.site.findFirst({ where: { crawled: false } });
        if (!entry) break;
        await search(entry, (await prisma.site.count()) > limit);
    }
    console.log(await prisma.site.count());
}

async function search(entry: Prisma.SiteCreateInput, skipUrls?: boolean) {
    const url = new URL(entry.url);
    console.log("crawling " + url.href);
    await prisma.site.update({ where: { url: url.href }, data: { crawled: true } });
    const robots = await parse(url, userAgentToken);

    if (!check(robots)) {
        return; // not allowed to crawl here
    }

    if (url.pathname == "/") {
        if (robots?.sitemap) {
            const sitemapRaw = await fetch(robots.sitemap);
            const sitemap = (await sitemapRaw.text()).matchAll(/(?<=<loc>).*(?=<\/loc>)/g); // TODO recursively parse further sitemaps

            prisma.site.createMany({
                data: [...sitemap].map((loc) => ({
                    url: loc[0],
                })),
            });
        }
    }

    const res = await fetch(url);

    if (!res.ok) return;

    if (res.redirected) {
        console.log("redirected to " + res.url);
        await prisma.site.upsert({
            where: { url: res.url },
            update: { incomingLinks: { create: [{ incomingUrl: url.href }] } },
            create: { url: res.url, incomingLinks: { create: [{ incomingUrl: url.href }] } },
        });
        return;
    }

    const raw = await res.text();

    if (!raw.startsWith("<!DOCTYPE html>")) return;

    const rendered = raw; // TODO: run javascript

    const title = rendered.match(/(?<=<title>).*?(?=<\/title>)/)?.[0] ?? url.href;
    let icon = "";

    const links = [...rendered.matchAll(/<link[\s\S]*?>/g)];
    for (const candidate of links) {
        if (candidate[0].includes('rel="icon"')) {
            icon = new URL(candidate[0].match(/(?<=href=").*?(?=")/g)?.[0] ?? "", url.origin).href;
            break;
        }
    }

    await prisma.site.update({
        where: { url: url.href },
        data: {
            title,
            icon,
        },
    });

    // match all urls
    const urls = [
        ...rendered.matchAll(
            /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s'"]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s'"]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s'"]{2,}|www\.[a-zA-Z0-9]+\.[^\s'"]{2,})|((?<=href=").*?(?="))/gm
        ),
    ];

    for (const match of urls) {
        try {
            const urlObj = new URL(
                match[0].startsWith("//")
                    ? url.protocol + match[0]
                    : match[0].startsWith("/")
                    ? url.origin + match[0]
                    : match[0]
            );
            if (!urlObj.host) break;

            const outgoingUrl = urlObj.href;

            // console.log(outgoingUrl);
            if (
                !(await prisma.link.findFirst({
                    where: { incomingUrl: url.href, outgoingUrl: outgoingUrl },
                }))
            ) {
                if (skipUrls) {
                    if (await prisma.site.findUnique({ where: { url: outgoingUrl } })) {
                        await prisma.site.update({
                            where: { url: outgoingUrl },
                            data: { incomingLinks: { create: [{ incomingUrl: url.href }] } },
                        });
                    }
                } else {
                    await prisma.site.upsert({
                        where: { url: outgoingUrl },
                        update: { incomingLinks: { create: [{ incomingUrl: url.href }] } },
                        create: {
                            url: outgoingUrl,
                            incomingLinks: { create: [{ incomingUrl: url.href }] },
                        },
                    });
                }
            }
        } catch (e) {
            if (e instanceof TypeError) {
                // console.log("bad url");
            } else {
                throw e;
            }
        }
    }
    console.log(urls.length + " urls found");

    const textOnly = rendered.replaceAll(/(<[\s\S]*?>)|(<\/[\s\S]*?>)/gm, "").toLowerCase(); // remove html tags

    // get count of all terms in the document
    const termCounts: { [term: string]: number } = {};
    let total = 0;
    let curr = "";
    for (const c of textOnly) {
        if (c.match(/\s/g)) {
            if (curr != "") {
                if (curr in termCounts && typeof termCounts[curr] == "number") termCounts[curr]++;
                else termCounts[curr] = 1;
                total++;
                curr = "";
            }
        } else if (c.match(/\w/g)) {
            curr += c;
        }
    }

    await prisma.term.createMany({
        data: Object.entries(termCounts).map((x) => ({
            name: x[0],
        })),
        skipDuplicates: true,
    });

    await prisma.termsOnSites.createMany({
        data: Object.entries(termCounts).map((x) => ({
            termName: x[0],
            siteUrl: url.href,
            frequency: x[1] / total,
        })),
    });
    console.log("finished " + url.href);
}
