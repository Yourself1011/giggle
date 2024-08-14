"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CiSearch } from "react-icons/ci";

export default function Home() {
    const [query, setQuery] = useState("");
    const router = useRouter();

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            <form
                className="py-2 px-4 rounded-full bg-white flex text-black"
                onSubmit={(e) => {
                    e.preventDefault();
                    router.push("/search?query=" + query);
                }}
            >
                <input
                    className="p-2 bg-none focus:outline-none w-[65dvw] max-w-xl"
                    placeholder="Search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button type="submit">
                    <CiSearch className="inline size-6" />
                </button>
            </form>
        </main>
    );
}
