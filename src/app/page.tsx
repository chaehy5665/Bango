import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-4 py-16 md:py-24">
        <div className="w-full max-w-3xl text-center">
          {/* Main Title */}
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            방고
          </h1>

          {/* Subtitle */}
          <h2 className="text-xl md:text-2xl font-semibold text-muted-foreground mb-6">
            서울 PC방 가격비교
          </h2>

          {/* Description */}
          <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            서울의 모든 PC방을 한 곳에서 비교하고 찾아보세요.
            <br className="hidden md:inline" />
            가격, 사양, 메뉴까지 한눈에 확인할 수 있습니다.
          </p>

          {/* Statistics */}
          <div className="mb-12 p-4 rounded-lg bg-card border border-border">
            <p className="text-sm md:text-base font-medium text-foreground">
              서울 50+개 PC방 가격 비교
            </p>
          </div>

          {/* CTA Button */}
          <Link
            href="/map"
            className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-primary text-primary-foreground font-medium transition-colors hover:opacity-90 active:opacity-80 touch-target"
          >
            지도에서 찾아보기
          </Link>
        </div>
      </main>
    </div>
  );
}
