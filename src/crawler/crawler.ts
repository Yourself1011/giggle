import { Prisma } from "@prisma/client";
import { check, parse } from "./robots";
import { prisma } from "@/prisma";

const userAgentToken = "GiggleBot";
const damping = 0.85;
const limit = 500;
export default async function start(rootURL: URL) {
    // search(rootURL);
    await prisma.site.create({
        data: {
            url: rootURL.href,
        },
    });

    while ((await prisma.site.count()) < limit) {
        const entry = await prisma.site.findFirst({ where: { crawled: false } });
        if (!entry) break;
        await search(entry);
    }
    console.log(await prisma.site.count());
}

async function search(entry: Prisma.SiteCreateInput) {
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

    const raw = await res.text();

    if (!raw.startsWith("<!DOCTYPE html>")) return;

    const rendered = raw; // TODO: run javascript

    // match all urls
    const urls = [
        ...rendered.matchAll(
            /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s'"]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s'"]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s'"]{2,}|www\.[a-zA-Z0-9]+\.[^\s'"]{2,})|((?<=href=").*?(?="))/gm
        ),
    ];

    for (const match of urls) {
        try {
            const outgoingUrl = new URL(
                match[0].startsWith("//")
                    ? url.protocol + match[0]
                    : match[0].startsWith("/")
                    ? url.origin + match[0]
                    : match[0]
            ).href;

            console.log(outgoingUrl);
            if (
                !(await prisma.link.findFirst({
                    where: { incomingUrl: entry.url, outgoingUrl: outgoingUrl },
                }))
            ) {
                // try {
                await prisma.site.upsert({
                    where: { url: outgoingUrl },
                    update: { incomingLinks: { create: [{ incomingUrl: entry.url }] } },
                    create: {
                        url: outgoingUrl,
                        incomingLinks: { create: [{ incomingUrl: entry.url }] },
                    },
                });
                // } catch (e) {
                //     throw e;
                // }
            }
        } catch (e) {
            if (e instanceof TypeError) {
                console.log("bad url");
            } else {
                throw e;
            }
        }
    }

    const textOnly = rendered.replaceAll(/(<[\s\S]*?>)|(<\/[\s\S]*?>)/gm, ""); // remove html tags

    // get count of all terms in the document
    const termCounts: { [term: string]: number } = {};
    let total = 0;
    let curr = "";
    for (const c of textOnly) {
        if (c == " " || c == "\n" || c == "\t") {
            if (curr != "") {
                if (curr in termCounts) termCounts[curr]++;
                else termCounts[curr] = 1;
                total++;
                curr = "";
            }
        } else {
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
