"use server";
import prisma from "@/prisma";

export interface QueryOut {
    url: string;
    title: string;
    icon: string;
    description: string;
    score: number;
}

export default async function query(query: string, amount: number, page: number) {
    const count = await prisma.site.count();
    const terms = query.toLowerCase().replace(/\W/g, " ").split(/\s/g);

    const idf: { [name: number]: number } = {};
    const dbTerms = await prisma.term.findMany({
        where: {
            name: {
                in: terms,
            },
        },
        include: {
            _count: {
                select: {
                    sites: true,
                },
            },
        },
    });

    dbTerms.forEach((x) => {
        idf[x.id] = Math.log10(count / x._count.sites);
    });

    const sites = await prisma.site.findMany({
        where: {
            AND: dbTerms.map((x) => ({ terms: { some: { termId: x.id } } })),
        },
        include: {
            terms: {
                where: {
                    termId: {
                        in: dbTerms.map((x) => x.id),
                    },
                },
            },
        },
    });

    const out: QueryOut[] = sites
        .map((site) => ({
            url: site.url,
            title: site.title,
            icon: site.icon,
            description: site.description,
            score:
                site.terms
                    .map((term) => term.frequency * idf[term.termId])
                    .reduce((p, c) => p + c, 0) * site.pageRank,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(amount * page, amount * (page + 1));

    return out;
}
