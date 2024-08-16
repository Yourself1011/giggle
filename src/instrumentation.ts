import { populate, start } from "./crawler/crawler";
import index from "./indexer";

export function register() {
    console.log("SLDkfj");
    (async () => {
        await populate();
        await start();
        await index();
    })();
}
