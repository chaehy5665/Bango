'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, MapPin, Search, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type Venue = {
  id: string;
  name: string;
  address_full: string;
  address_district: string;
};

export function SearchBar() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Venue[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isMobileOverlayOpen, setIsMobileOverlayOpen] = useState(false);
  
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const closeMobileOverlay = useCallback(() => {
    setIsMobileOverlayOpen(false);
    setShowResults(false);
    if (!searchTerm.trim()) {
      setHasSearched(false);
    }
  }, [searchTerm]);

  const performSearch = useCallback(async (query: string) => {
    setIsSearching(true);
    setHasSearched(true);
    
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('venues')
      .select('id, name, address_full, address_district')
      .or(`name.ilike.%${query}%,address_full.ilike.%${query}%`)
      .limit(10);
    
    if (!error && data && data.length > 0) {
      setResults(data);
      setShowResults(true);
    } else {
      setResults([]);
      setShowResults(false);
    }
    
    setIsSearching(false);
  }, []);

  // Focus input on mount for better UX on search page
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle click outside to close dropdown on desktop
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (window.innerWidth < 768) return;
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmedTerm = searchTerm.trim();
    
    if (!trimmedTerm) {
      return;
    }

    const timer = setTimeout(() => {
      void performSearch(trimmedTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [performSearch, searchTerm]);

  const handleClear = () => {
    setSearchTerm('');
    setResults([]);
    setShowResults(false);
    setHasSearched(false);
    inputRef.current?.focus();
  };

  const handleResultClick = (venueId: string) => {
    closeMobileOverlay();
    router.push(`/venues/${venueId}`);
  };

  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value);

    if (!value.trim()) {
      setResults([]);
      setShowResults(false);
      setHasSearched(false);
      setIsSearching(false);
    }
  };

  const showEmptyState = hasSearched && !isSearching && results.length === 0;

  return (
    <div 
      ref={containerRef}
      className={cn(
        'w-full max-w-md mx-auto',
        isMobileOverlayOpen
          ? 'fixed inset-0 z-50 bg-background px-4 py-4 md:static md:z-auto md:bg-transparent md:p-0'
          : 'relative'
      )}
    >
      {isMobileOverlayOpen && (
        <div className="mb-4 flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={closeMobileOverlay}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background"
            aria-label="검색 닫기"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-sm text-muted-foreground">모바일 전체 화면 검색</p>
            <h2 className="text-lg font-semibold">PC방 검색</h2>
          </div>
        </div>
      )}

      {/* Search Input Container */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          className={cn(
            "block w-full pl-10 pr-10 py-3 rounded-lg border border-input bg-background text-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
            "placeholder:text-muted-foreground",
            "shadow-sm transition-all duration-200"
          )}
          placeholder="PC방 이름 또는 주소 검색..."
          value={searchTerm}
          onChange={(e) => handleSearchTermChange(e.target.value)}
          onFocus={() => {
            setIsMobileOverlayOpen(true);
            if (searchTerm.trim() && results.length > 0) {
              setShowResults(true);
            }
          }}
        />

        {/* Right Icon: Loader or Clear Button */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          {isSearching ? (
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
          ) : searchTerm ? (
            <button
              onClick={handleClear}
              className="p-1 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Results Dropdown / Overlay */}
      {showResults && results.length > 0 && (
        <div className={cn(
          'mt-4 overflow-y-auto animate-in fade-in zoom-in-95 duration-100',
          'max-h-[calc(100vh-10rem)] rounded-none border-0 bg-transparent shadow-none',
          'md:absolute md:left-0 md:right-0 md:top-full md:mt-2 md:max-h-[60vh] md:rounded-lg md:border md:border-border md:bg-popover md:shadow-lg'
        )}>
          <ul className="py-1">
            {results.map((venue) => (
              <li key={venue.id}>
                <button
                  onClick={() => handleResultClick(venue.id)}
                  className="w-full text-left px-4 py-3 hover:bg-accent hover:text-accent-foreground transition-colors flex items-start gap-3 group"
                >
                  <div className="mt-1 bg-primary/10 p-1.5 rounded-full group-hover:bg-primary/20 transition-colors">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{venue.name}</div>
                    <div className="text-sm text-muted-foreground line-clamp-1">{venue.address_full}</div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty State Message (shown when no results but searched) */}
      {showEmptyState && (
        <div className="mt-8 text-center text-muted-foreground animate-in fade-in slide-in-from-bottom-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
            <Search className="h-6 w-6 opacity-50" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">검색 결과가 없습니다</h3>
          <p className="text-sm">
            &quot;{searchTerm}&quot;에 대한 결과를 찾을 수 없습니다.<br />
            다른 키워드로 검색해보세요.
          </p>
        </div>
      )}
    </div>
  );
}
