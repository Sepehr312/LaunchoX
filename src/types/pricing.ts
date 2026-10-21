export interface ProductPricingDTO {
  originalPrice: number;
  finalPrice: number;
  discountAmount: number;
  discountPercent: number;
  hasDiscount: boolean;
}
