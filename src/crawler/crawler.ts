import { Prisma } from "@prisma/client";

const userAgentToken = "GiggleBot";
const damping = 0.85;
export default function start(rootURL: string) {}

async function search(url: URL) {
    let toAdd: Prisma.SiteCreateInput = { url: url.href, pageRank: 0 };

    

    const res = await fetch(url);

    if (res.ok) {
    }
}
