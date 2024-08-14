"use server";
import prisma from "@/prisma";

export default async function query(query: string, amount: number, page: number) {
    const terms = query.replace(/\w/g, "").split(/\s/g);

    const idf: { [name: string]: number } = {};
    const dbTerms = await prisma.term.findMany({
        where: {
            name: {
                in: terms,
            },
        },
    });

    dbTerms.forEach((x) => {
        idf[x.name] = x.IDF;
    });

    const sites = await prisma.site.findMany({
        where: {
            terms: {
                every: {
                    termName: {
                        in: terms,
                    },
                },
            },
        },
        include: {
            terms: true,
        },
    });

    const out: { url: string; score: number }[] = sites
        .map((site) => ({
            url: site.url,
            score:
                site.terms
                    .map((term) => term.frequency * idf[term.termName])
                    .reduce((p, c) => p + c, 0) * site.pageRank,
        }))
        .sort((a, b) => a.score - b.score)
        .slice(amount * page, amount * (page + 1));

    return out;
}
