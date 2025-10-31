
export interface Artwork {
  id: number;
  title: string;
  image_id: string | null;
  artist_display: string;
  date_display: string;
  place_of_origin: string;
  description: string | null;
  dimensions: string;
  medium_display: string;
  credit_line: string;
  thumbnail: {
    lqip: string;
    width: number;
    height: number;
    alt_text: string;
  } | null;
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  total_pages: number;
  current_page: number;
  next_url?: string;
}

export interface ApiResponse {
  data: Artwork[];
  pagination: Pagination;
  config: {
    iiif_url: string;
  };
}
