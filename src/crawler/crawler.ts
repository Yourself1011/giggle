import { Prisma } from "@prisma/client";
import { check, parse } from "./robots";
import { prisma } from "@/prisma";

const userAgentToken = "GiggleBot";
const limit = 20000;

let crawled = 0;

export async function populate() {
    await prisma.site.createMany({
        data: [
            {
                url: "http://odp.org/",
            },
            {
                url: "https://en.wikipedia.org/wiki/Main_Page",
            },
            {
                url: "https://stackoverflow.com/",
            },
        ],
    });
}

export async function start() {
    crawled = await prisma.site.count({ where: { crawled: true } });

    while (true) {
        const entry = await prisma.site.findFirst({
            where: { crawled: false },
            orderBy: { order: "asc" },
        });
        if (!entry) break;
        await search(entry, (await prisma.site.count()) > limit);
    }
    console.log(await prisma.site.count());
}

async function search(entry: Prisma.SiteCreateInput, skipUrls?: boolean) {
    let start = Date.now();
    function logTime(event: string) {
        if (process.env.NODE_ENV !== "production") {
            console.log(`${event} ${Date.now() - start}ms`);
            start = Date.now();
        }
    }

    const url = new URL(entry.url);
    console.log("crawling " + url.href);
    crawled++;
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

    // logTime("robots");

    let res;
    try {
        res = await fetch(url);
    } catch (e) {
        if (!(e instanceof TypeError)) {
            throw e;
        }
        return;
    }

    // logTime("request");

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

    // logTime("to text");

    // match all urls
    const urls = [
        ...rendered.matchAll(
            /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s'"]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s'"]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s'"]{2,}|www\.[a-zA-Z0-9]+\.[^\s'"]{2,})|((?<=href=").*?(?="))/gm
        ),
    ].map((x) => {
        try {
            return new URL(
                x[0].startsWith("//")
                    ? url.protocol + x[0]
                    : x[0].startsWith("/")
                    ? url.origin + x[0]
                    : x[0]
            );
        } catch (e) {
            if (e instanceof TypeError) {
                return null;
            } else {
                throw e;
            }
        }
    });

    let urlCount = 0;
    let operations = [];
    for (let i = 0; i < urls.length; i++) {
        const match = urls[i];
        // invalid url or deduplicate
        if (!match || !match.host || urls.findIndex((x) => x && x.href == match.href) !== i)
            continue;

        const outgoingUrl = match.href;

        // console.log(outgoingUrl);
        if (skipUrls) {
            if (await prisma.site.findUnique({ where: { url: outgoingUrl } })) {
                operations.push(
                    prisma.site.update({
                        where: { url: outgoingUrl },
                        data: { incomingLinks: { create: [{ incomingUrl: url.href }] } },
                    })
                );
            }
        } else {
            operations.push(
                prisma.site.upsert({
                    where: { url: outgoingUrl },
                    update: { incomingLinks: { create: [{ incomingUrl: url.href }] } },
                    create: {
                        url: outgoingUrl,
                        incomingLinks: { create: [{ incomingUrl: url.href }] },
                    },
                })
            );
        }
        urlCount++;
    }

    await prisma.$transaction(operations);

    console.log(urlCount + " urls found");
    // logTime("urls db");

    const title = rendered.match(/(?<=<title>).*?(?=<\/title>)/)?.[0] ?? url.href;
    let icon = "";
    let description = "No description provided";

    const links = [...rendered.matchAll(/<link[\s\S]*?>/g)];
    for (const candidate of links) {
        if (candidate[0].includes('rel="icon"')) {
            icon = new URL(candidate[0].match(/(?<=href=").*?(?=")/g)?.[0] ?? "", url.origin).href;
            break;
        }
    }
    const metas = [...rendered.matchAll(/<meta[\s\S]*?>/g)];
    for (const candidate of metas) {
        if (candidate[0].includes('name="description"')) {
            description = candidate[0].match(/(?<=content=").*?(?=")/g)?.[0] ?? description;
            break;
        }
    }

    // logTime("meta");

    await prisma.site.update({
        where: { url: url.href },
        data: {
            title,
            icon,
            description,
        },
    });
    // logTime("meta db");

    const textOnly = rendered.replaceAll(/(<[\s\S]*?>)|(<\/[\s\S]*?>)/gm, "").toLowerCase(); // remove html tags

    // get count of all terms in the document
    const termCounts: { [term: string]: number } = {};
    let total = 0;
    let curr = "";
    for (const c of textOnly) {
        if (c.match(/\s/g)) {
            if (curr != "" && curr.length < 100) {
                if (curr in termCounts && typeof termCounts[curr] == "number") termCounts[curr]++;
                else termCounts[curr] = 1;
                total++;
            }
            curr = "";
        } else if (c.match(/\w/g)) {
            curr += c;
        }
    }
    for (const c of title + " " + description) {
        if (c.match(/\s/g)) {
            if (curr != "" && curr.length < 100) {
                if (curr in termCounts && typeof termCounts[curr] == "number")
                    termCounts[curr] += 2;
                else termCounts[curr] = 2;
                total += 2;
            }
            curr = "";
        } else if (c.match(/\w/g)) {
            curr += c;
        }
    }

    // logTime("terms");

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
    // logTime("terms db");
    console.log(
        `finished ${url.href} in ${
            Date.now() - start
        }ms\n${crawled}/${await prisma.site.count()} crawled`
    );
}
