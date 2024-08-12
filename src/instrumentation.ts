import start from "./crawler/crawler";

export async function register() {
    console.log("SLDkfj");
    start(new URL("http://www.wikipedia.org"));
}
