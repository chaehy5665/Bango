import { SearchBar } from '@/components/search/search-bar';

export default function SearchPage() {
  return (
    <div className="container max-w-2xl mx-auto px-4 py-8 md:py-16 min-h-screen">
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">PC방 찾기</h1>
        <p className="text-muted-foreground">
          원하는 지역이나 PC방 이름을 검색해보세요
        </p>
      </div>
      
      <SearchBar />
      
      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>추천 검색어: 강남, 홍대, 레전드, 3080</p>
      </div>
    </div>
  );
}
