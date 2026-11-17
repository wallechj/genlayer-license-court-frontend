import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "LicenseCourt — GenLayer",
  description:
    "Open-source license compliance adjudication on GenLayer intelligent contracts.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          margin: 0,
          background: "#0b0e14",
          color: "#e6e9f0",
        }}
      >
        {children}
      </body>
    </html>
  );
}
