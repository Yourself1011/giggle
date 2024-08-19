import Search from "./Search";
import { Metadata } from "next";

type MetaProps = {
    searchParams: { [key: string]: string | string[] | undefined };
};
export function generateMetadata({ searchParams }: MetaProps): Metadata {
    const query = searchParams.query;
    return {
        title: query + " - Giggle",
    };
}

export default function Page() {
    return <Search />;
}
