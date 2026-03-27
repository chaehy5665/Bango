'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Loader2, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';
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
  
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus input on mount for better UX on search page
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle click outside to close dropdown on desktop
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
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
      setResults([]);
      setShowResults(false);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(trimmedTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  async function performSearch(query: string) {
    setIsSearching(true);
    setHasSearched(true);
    
    const supabase = createClient();
    
    // Using ilike for case-insensitive search on name OR address
    const { data, error } = await supabase
      .from('venues')
      .select('id, name, address_full, address_district')
      .or(`name.ilike.%${query}%,address_full.ilike.%${query}%`)
      .limit(10);
    
    if (!error && data && data.length > 0) {
      setResults(data);
      setShowResults(true);
    } else {
      if (error) console.error('Search error:', error);
      setResults([]);
      setShowResults(false);
    }
    
    setIsSearching(false);
  }

  const handleClear = () => {
    setSearchTerm('');
    setResults([]);
    setShowResults(false);
    setHasSearched(false);
    inputRef.current?.focus();
  };

  const handleResultClick = (venueId: string) => {
    router.push(`/venues/${venueId}`);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full max-w-md mx-auto"
    >
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
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
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
          "absolute top-full left-0 right-0 mt-2",
          "bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50",
          "max-h-[60vh] overflow-y-auto",
          "animate-in fade-in zoom-in-95 duration-100"
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
      {hasSearched && !isSearching && results.length === 0 && (
        <div className="mt-8 text-center text-muted-foreground animate-in fade-in slide-in-from-bottom-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
            <Search className="h-6 w-6 opacity-50" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">검색 결과가 없습니다</h3>
          <p className="text-sm">
            "{searchTerm}"에 대한 결과를 찾을 수 없습니다.<br />
            다른 키워드로 검색해보세요.
          </p>
        </div>
      )}
    </div>
  );
}
