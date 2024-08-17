export interface Rule {
    type: string;
    path: string;
}

export interface Robots {
    url: URL;
    rules: Rule[];
    globalUserAgent: boolean;
    sitemap?: string;
}

export async function parse(url: URL, userAgent: string): Promise<Robots | null> {
    const robotsURL = new URL("/robots.txt", url.origin);

    let res;
    try {
        res = await fetch(robotsURL);
    } catch (e) {
        if (!(e instanceof TypeError)) {
            throw e;
        }
        return null;
    }
    if (!res.ok) return null;

    const out: Robots = { url, rules: [], globalUserAgent: true };

    const robots = await res.text();

    const split = robots.split(/\r\n|\r|\n/);

    let currUserAgent = false;
    for (let line of split) {
        line = line.split("#")[0]; // remove comment

        const [rule, value] = line.toLowerCase().split(": ");

        if (rule == "user-agent") {
            if (value == "*" && out.globalUserAgent) {
                currUserAgent = true;
                out.globalUserAgent = true;
            } else if (value == userAgent) {
                currUserAgent = true;
                out.globalUserAgent = false;
                out.rules = [];
            } else {
                currUserAgent = false;
            }
        } else if (rule == "sitemap") out.sitemap = value;
        else if (currUserAgent) {
            if (rule == "allow" || rule == "disallow") out.rules.push({ type: rule, path: value });
        }
    }

    return out;
}

export function check(robots: Robots | null): boolean {
    if (!robots) return true;

    let closest: Rule = { type: "allow", path: "" };

    const path = robots.url.pathname;
    for (const rule of robots.rules) {
        if (rule.path.length < closest.path.length) continue;

        if (
            !path.match(
                new RegExp(
                    "^" +
                        rule.path
                            .replaceAll(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&") // sanitize
                            .replaceAll("\\*", ".*")
                            .replaceAll("\\$", "$")
                )
            )
        )
            continue;

        if (
            rule.path.length == closest.path.length &&
            rule.type == "disallow" &&
            closest.type == "allow"
        )
            continue;
        closest = rule;
    }

    return closest.type == "allow";
}
