export type Category = {
  id: string;
  name: string;
};

export type Store = {
  id: string;
  name: string;
  categories: Category[];
};

export type Product = {
  /** Unikt över alla butiker, t.ex. "leksakslada:123". */
  id: string;
  storeId: string;
  storeName: string;
  categoryId: string;
  title: string;
  /** Pris i hela kronor. */
  price: number;
  currency: 'SEK';
  imageUrl: string;
  productUrl: string;
};

export type WishItem = Product & { addedAt: number };

/** Föräldrarnas filter. Kategorier anges som "butiksId:kategoriId". */
export type Settings = {
  storeIds: string[];
  categoryKeys: string[];
  minPrice: number;
  maxPrice: number;
};

export type ProductQuery = {
  categoryIds: string[];
  minPrice: number;
  maxPrice: number;
};

/**
 * En produktkälla per butik. Idag finns bara en mock-implementation; en riktig
 * källa hämtar från en backend som läser butikernas produktflöden (se docs/SPEC.md).
 */
export interface ProductSource {
  store: Store;
  fetchProducts(query: ProductQuery): Promise<Product[]>;
}
