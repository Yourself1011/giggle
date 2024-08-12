import start from "./crawler/crawler";

export async function register() {
    console.log("SLDkfj");
    start(new URL("https://en.wikipedia.org/wiki/Main_Page"));
}
