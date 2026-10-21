import { Category } from "@/models/category";
import { Product } from "@/models/product";
import {
  catalogCategories,
  splitRefrigeratorCategory,
} from "./catalog-categories";

export async function syncCatalogCategories() {
  const combined = await Category.findOne({ slug: "home-kitchen" }).lean();
  const products = combined
    ? await Product.find({ category: combined._id })
        .select("title category")
        .lean()
    : [];
  const ids = new Map<string, string>();
  for (const [order, definition] of catalogCategories.entries()) {
    const category = await Category.findOneAndUpdate(
      { slug: definition.slug },
      {
        $set: {
          name: definition.title,
          description: `مدل‌های ${definition.title} را بر اساس قیمت، برند و مشخصات بررسی کنید.`,
          image: `/images/preview/categories/${definition.image}.png`,
          order,
        },
        $setOnInsert: { slug: definition.slug, isActive: true },
      },
      { upsert: true, returnDocument: "after", runValidators: true },
    ).orFail();
    ids.set(definition.slug, String(category._id));
  }
  let moved = 0;
  for (const product of products) {
    const target = ids.get(splitRefrigeratorCategory(product.title));
    if (target && target !== String(product.category)) {
      const result = await Product.collection.updateOne(
        { _id: product._id, category: product.category },
        { $set: { category: new Category.base.Types.ObjectId(target) } },
      );
      if (result.matchedCount !== 1)
        throw new Error("Product changed during category migration");
      moved++;
    }
  }
  return { categories: ids.size, moved };
}
