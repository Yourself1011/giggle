import prisma from "./prisma";

export default async function index() {
    await calculateIDFs();
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
