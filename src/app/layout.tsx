import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { BottomNav } from "@/components/layout/bottom-nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "방고 - 서울 PC방 가격비교",
  description:
    "서울의 PC방 가격, 사양, 메뉴, 주변기기를 한눈에 비교하세요",
  openGraph: {
    title: "방고 - 서울 PC방 가격비교",
    description:
      "서울의 PC방 가격, 사양, 메뉴, 주변기기를 한눈에 비교하세요",
    type: "website",
    locale: "ko_KR",
    url: "https://banggo.kr",
    images: [
      {
        url: "https://banggo.kr/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "방고 - 서울 PC방 가격비교",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
