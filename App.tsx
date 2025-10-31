import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { type Artwork, type Pagination as PaginationType, type ApiResponse } from './types';
import { fetchArtworks, constructImageUrl } from './services/articService';
import { generateEnhancedQuery } from './services/geminiService';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import FilterBar from './components/FilterBar';
import ArtworkGrid from './components/ArtworkGrid';
import Pagination from './components/Pagination';
import ArtworkDetailModal from './components/ArtworkDetailModal';
import Loader from './components/Loader';
import ErrorMessage from './components/ErrorMessage';

const App: React.FC = () => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [pagination, setPagination] = useState<PaginationType | null>(null);
  const [apiConfig, setApiConfig] = useState<{ iiif_url: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [baseQuery, setBaseQuery] = useState<string>('impressionism');
  const [activeFilters, setActiveFilters] = useState<{ period: string | null; medium: string | null; color: string | null; }>({
    period: null,
    medium: null,
    color: null,
  });
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);

  const finalQuery = useMemo(() => {
    return [baseQuery, activeFilters.period, activeFilters.medium].filter(Boolean).join(' ').trim();
  }, [baseQuery, activeFilters.period, activeFilters.medium]);

  const loadArtworks = useCallback(async () => {
    if (!finalQuery) {
        setArtworks([]);
        setPagination(null);
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data: ApiResponse = await fetchArtworks(finalQuery, currentPage);
      const artworksWithImages = data.data.filter(artwork => artwork.image_id);
      setArtworks(artworksWithImages);
      setPagination(data.pagination);
      setApiConfig(data.config);
    } catch (err) {
      setError('Failed to fetch artworks. Please try again later.');
      console.error(err);
      setArtworks([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [finalQuery, currentPage]);

  useEffect(() => {
    loadArtworks();
  }, [loadArtworks]);

  const handleSearchSubmit = () => {
    // A new search from text input resets filters
    setActiveFilters({ period: null, medium: null, color: null });
    if (currentPage !== 1) {
        setCurrentPage(1);
    } else {
        // If already on page 1, the effect won't re-run unless the query changes.
        // Force a reload if the query is the same.
        loadArtworks();
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handlePeriodChange = (period: string | null) => {
    setActiveFilters(prev => ({ ...prev, period, color: null }));
    setCurrentPage(1);
  };
  
  const handleMediumChange = (medium: string | null) => {
    setActiveFilters(prev => ({ ...prev, medium, color: null }));
    setCurrentPage(1);
  };

  const handleColorChange = async (color: string) => {
    if (activeFilters.color === color) {
        setActiveFilters(prev => ({...prev, color: null}));
        return;
    }
    
    setIsGenerating(true);
    setError(null);
    try {
        const queryForAI = finalQuery || 'art';
        const enhancedQuery = await generateEnhancedQuery(queryForAI, color);
        setBaseQuery(enhancedQuery);
        setActiveFilters({ period: null, medium: null, color });
        setCurrentPage(1);
    } catch (err) {
        setError('AI search enhancement failed. Please try again.');
        console.error(err);
        setActiveFilters(prev => ({...prev, color: null}));
    } finally {
        setIsGenerating(false);
    }
  };

  const handleArtworkClick = (artwork: Artwork) => {
    setSelectedArtwork(artwork);
  };

  const handleCloseModal = () => {
    setSelectedArtwork(null);
  };
  
  const getSelectedArtworkImageUrl = () => {
    if (selectedArtwork && apiConfig) {
      return constructImageUrl(selectedArtwork.image_id, apiConfig.iiif_url);
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      <Header />
      <main>
        <div className="sticky top-[120px] sm:top-[128px] z-20">
            <SearchBar 
                onSearch={handleSearchSubmit} 
                isLoading={isLoading || isGenerating}
                query={baseQuery}
                setQuery={setBaseQuery}
            />
            <FilterBar 
                activeFilters={activeFilters}
                onPeriodChange={handlePeriodChange}
                onMediumChange={handleMediumChange}
                onColorChange={handleColorChange}
                isGenerating={isGenerating}
                isLoading={isLoading}
            />
        </div>

        {error && <ErrorMessage message={error} />}
        
        {isLoading && artworks.length === 0 ? (
          <Loader />
        ) : (
          !isLoading && artworks.length === 0 && finalQuery ?
            <p className="text-center text-gray-400 mt-8 px-4">No artworks found for "{finalQuery}". Try a different search.</p> :
            apiConfig && <ArtworkGrid artworks={artworks} config={apiConfig} onArtworkClick={handleArtworkClick} isLoading={isLoading} />
        )}
        
        {pagination && pagination.total_pages > 1 && !error && (
          <Pagination pagination={pagination} onPageChange={handlePageChange} isLoading={isLoading || isGenerating} />
        )}
      </main>
      <ArtworkDetailModal 
        artwork={selectedArtwork}
        imageUrl={getSelectedArtworkImageUrl()}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default App;
