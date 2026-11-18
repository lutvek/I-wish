/** En sida (t.ex. en kategori på en butiks hemsida) som föräldern lagt till. */
export type Source = {
  id: string;
  url: string;
  /** Webbplatsens namn, t.ex. "hm.com". */
  site: string;
  addedAt: number;
};

/** En produkt som lästs från en sida, innan den kopplats till en källa. */
export type ScrapedProduct = {
  title: string;
  /** Pris i hela kronor. */
  price: number;
  imageUrl: string;
  productUrl: string;
};

export type ExtractResult = {
  title: string;
  products: ScrapedProduct[];
};

/** Senast hämtade produkter för en källa. */
export type CatalogEntry = {
  fetchedAt: number;
  /** Sidans rubrik, t.ex. "Barnkläder". */
  title?: string;
  products: ScrapedProduct[];
  error?: string;
};

export type Product = ScrapedProduct & {
  /** Unikt över alla källor. */
  id: string;
  sourceId: string;
  storeName: string;
};

export type WishItem = Product & { addedAt: number };

export type Settings = {
  sources: Source[];
  minPrice: number;
  maxPrice: number;
};
