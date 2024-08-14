"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CiSearch } from "react-icons/ci";

export function SearchBar({ initQuery }: { initQuery: string }) {
    const [query, setQuery] = useState(initQuery);
    const router = useRouter();

    return (
        <form
            className="py-2 px-4 rounded-full bg-white flex w-fit"
            onSubmit={(e) => {
                e.preventDefault();
                router.push("/search?query=" + query);
            }}
        >
            <input
                className="p-1.5 bg-none focus:outline-none w-[35dvw] max-w-xl"
                placeholder="Search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit">
                <CiSearch className="inline size-6" />
            </button>
        </form>
    );
}
