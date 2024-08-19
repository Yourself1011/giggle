import React, { Suspense } from "react";

export default function SearchLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <Suspense>{children}</Suspense>;
}
