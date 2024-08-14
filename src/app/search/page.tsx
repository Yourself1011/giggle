"use server";
import { SearchBar } from "../components/searchBar";
import queryDb from "./query";

export default async function Search({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    let query = searchParams?.query ?? "skibidi toilet";
    if (query instanceof Array) query = query[0];

    return (
        <main>
            <div className="p-8 backdrop-blur-lg bg-gray-900/20 border-b-[1px] border-b-gray-800 sticky top-0">
                <SearchBar initQuery={query} />
            </div>
            <div className="flex flex-col gap-4 p-8">
                {(await queryDb(query, 10, 0)).map((x, i) => (
                    <a key={i} href={x.url}>
                        {x.url}
                    </a>
                ))}
            </div>
        </main>
    );
}
