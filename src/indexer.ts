import { Prisma } from "@prisma/client";
import prisma from "./prisma";

export default async function index() {
    await calculateIDFs();
    await pageRank();
}

async function calculateIDFs() {
    const count = await prisma.site.count();

    const terms = await prisma.term.findMany({ select: { name: true, sites: true } });

    await prisma.$transaction(
        terms.map((term) =>
            prisma.term.update({
                where: { name: term.name },
                data: { IDF: Math.log10(count / term.sites.length) },
            })
        )
    );
    console.log("calculated idfs");
}

async function pageRank() {
    const damping = 0.85;
    const iterations = 25;
    const count = await prisma.site.count();

    const sites: {
        [key: string]: Prisma.SiteGetPayload<{ include: { incomingLinks?: true } }> & {
            pageRankBuffer: number;
        };
    } = {};

    (
        await prisma.site.findMany({
            include: { incomingLinks: true },
        })
    ).forEach((x) => {
        sites[x.url] = { ...x, pageRankBuffer: 0 };
    });

    for (let i = 0; i < iterations; i++) {
        for (const site of Object.values(sites)) {
            for (const link of site.incomingLinks) {
                const incoming = sites[link.incomingUrl];
                site.pageRankBuffer += incoming.pageRank / incoming.incomingLinks.length;
            }
        }

        for (const site of Object.values(sites)) {
            site.pageRank = site.pageRankBuffer * damping + (1 - damping) / count;
            site.pageRankBuffer = 0;
        }

        console.log(`finished pagerank iteration ${i + 1}/${iterations}`);
    }

    for (const site of Object.values(sites)) {
        await prisma.site.update({
            where: { url: site.url },
            data: { pageRank: site.pageRank },
        });
    }
}
