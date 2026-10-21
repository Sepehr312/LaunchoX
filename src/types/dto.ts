import type {
  AddressFields,
  OrderStatus,
  PaymentStatus,
  ProductAttribute,
  UserRole,
} from "@/types/domain";

export interface TimestampsDTO {
  createdAt: string;
  updatedAt: string;
}
export interface EntityDTO extends TimestampsDTO {
  id: string;
}
export interface AddressDTO extends AddressFields, EntityDTO {}
export interface UserDTO extends EntityDTO {
  name: string;
  email: string;
  mobile?: string;
  role: UserRole;
  addresses: AddressDTO[];
  isActive: boolean;
}
export interface CategoryDTO extends EntityDTO {
  name: string;
  slug: string;
  parent?: string;
  description?: string;
  image?: string;
  order: number;
  isActive: boolean;
}
export interface StoreCategoryDTO extends CategoryDTO {
  productCount: number;
}
export interface BrandDTO extends EntityDTO {
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  country?: string;
  website?: string;
  isActive: boolean;
  isFeatured: boolean;
  order: number;
}
export interface StoreBrandDTO {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  productCount: number;
}
export interface StoreBrandDetailDTO extends StoreBrandDTO {
  description?: string;
}
export interface ProductDTO extends EntityDTO {
  title: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  sku?: string;
  images: string[];
  category: string;
  attributes: (ProductAttribute & TimestampsDTO)[];
  isActive: boolean;
  isFeatured: boolean;
  soldCount: number;
}
export interface ProductCategoryDTO {
  isActive?: boolean;
  id: string;
  name: string;
  slug: string;
}
export interface StoreProductDTO extends Omit<ProductDTO, "category"> {
  category: ProductCategoryDTO;
}
export type CompareProductDTO = Pick<
  StoreProductDTO,
  | "id"
  | "title"
  | "slug"
  | "price"
  | "compareAtPrice"
  | "stock"
  | "sku"
  | "images"
  | "category"
  | "attributes"
  | "createdAt"
  | "updatedAt"
>;
export interface ProductFilterOptionsDTO {
  brands: string[];
  energies: string[];
  maxPrice: number;
}
export interface CategoryTreeDTO extends CategoryDTO {
  children: CategoryTreeDTO[];
}
export interface CartItemDTO extends TimestampsDTO {
  product: string;
  quantity: number;
}
export type CartDTO = EntityDTO & { items: CartItemDTO[] } & (
    { user: string; guestId?: never } | { user?: never; guestId: string }
  );
export interface OrderItemDTO extends TimestampsDTO {
  product: string;
  title: string;
  slug: string;
  image: string;
  price: number;
  quantity: number;
}
export interface PaymentDTO extends TimestampsDTO {
  status: PaymentStatus;
  provider?: string;
  authority?: string;
  refId?: string;
  paidAt?: string;
}
export interface StatusHistoryDTO extends TimestampsDTO {
  status: OrderStatus;
  changedAt: string;
  changedBy?: string;
}
export interface OrderDTO extends EntityDTO {
  orderNumber: string;
  user: string;
  items: OrderItemDTO[];
  subtotal: number;
  shippingFee: number;
  total: number;
  shippingAddress: AddressFields & TimestampsDTO;
  status: OrderStatus;
  payment: PaymentDTO;
  note?: string;
  statusHistory: StatusHistoryDTO[];
}
export interface CounterDTO extends EntityDTO {
  seq: number;
}
export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
