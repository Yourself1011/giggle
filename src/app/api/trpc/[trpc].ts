import { appRouter } from "@/server/router";
import { createNextApiHandler } from "@trpc/server/adapters/next";

export default createNextApiHandler({
    router: appRouter,
    createContext: () => ({}),
});
