import start from "./crawler/crawler";
import index from "./indexer";

export function register() {
    console.log("SLDkfj");
    (async () => {
        await start(new URL("https://en.wikipedia.org/wiki/Main_Page"));
        await index();
    })();
}
