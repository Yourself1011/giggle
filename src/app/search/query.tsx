"use server";
import prisma from "@/prisma";

export interface QueryOut {
    url: string;
    score: number;
}

export default async function query(query: string, amount: number, page: number) {
    const terms = query.toLowerCase().replace(/\W/g, " ").split(/\s/g);

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
            AND: terms.map((x) => ({ terms: { some: { termName: x } } })),
        },
        include: {
            terms: {
                where: {
                    termName: {
                        in: terms,
                    },
                },
            },
        },
    });

    const out: QueryOut[] = sites
        .map((site) => ({
            url: site.url,
            score:
                site.terms
                    .map((term) => term.frequency * idf[term.termName])
                    .reduce((p, c) => p + c, 0) * site.pageRank,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(amount * page, amount * (page + 1));

    return out;
}
