import { Prisma } from "@prisma/client";
import prisma from "./prisma";

export default async function index() {
    // await calculateIDFs();
    await pageRank();
}

// async function calculateIDFs() {
//     const start = Date.now();
//     const count = await prisma.site.count();
//     const termCount = await prisma.term.count({
//         where: { AND: [{ sites: { some: {} } }, { IDF: { equals: 0 } }] },
//     });

//     console.log(`begin idf ${termCount / 2000} batches`);

//     const terms = await prisma.term.findMany({
//         take: 2000,
//         where: { AND: [{ sites: { some: {} } }, { IDF: { equals: 0 } }] },
//         select: { name: true, _count: { select: { sites: true } } },
//     });

//     let cursor = { name: terms[terms.length - 1].name };

//     console.log("begin transaction");

//     await prisma.$transaction(
//         terms.map((term) =>
//             prisma.term.update({
//                 where: { name: term.name },
//                 data: { IDF: Math.log10(count / term._count.sites) },
//             })
//         )
//     );
//     console.log(`finished idf batch 1/${termCount / 2000}`);

//     for (let i = 1; i < termCount / 2000; i++) {
//         const terms = await prisma.term.findMany({
//             take: 2000,
//             skip: 1,
//             cursor,
//             where: { AND: [{ sites: { some: {} } }, { IDF: { equals: 0 } }] },
//             select: { name: true, _count: { select: { sites: true } } },
//         });

//         cursor = { name: terms[terms.length - 1].name };

//         await prisma.$transaction(
//             terms.map((term) =>
//                 prisma.term.update({
//                     where: { name: term.name },
//                     data: { IDF: Math.log10(count / term._count.sites) },
//                 })
//             )
//         );
//         console.log(`finished idf batch ${i + 1}/${termCount / 2000}`);
//     }
//     console.log(`calculated idfs in ${Date.now() - start}ms`);
// }

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
