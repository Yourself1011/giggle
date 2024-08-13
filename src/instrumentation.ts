import start from "./crawler/crawler";
import index from "./indexer";

export async function register() {
    console.log("SLDkfj");
    await start(new URL("https://en.wikipedia.org/wiki/Main_Page"));
    await index();
}
