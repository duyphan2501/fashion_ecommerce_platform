import mongoose from "mongoose";
import redisClient from "../config/init.redis.js";
import ProductModel from "../models/product.model.js";
import VariantModel from "../models/variant.model.js";
import { getAvailableStockDB } from "./variant.service.js";
import createHttpError from "http-errors";

const USER_CART_TTL = 60 * 60 * 24 * 7; // 7 ngày
const GUEST_CART_TTL = 60 * 60 * 24 * 4; // 4 ngày

const getCartKey = (userId, guestCartId) =>
  userId ? `cart:${userId}` : `cart:${guestCartId}`;

const getCartQtyKey = (userId, guestCartId) =>
  `${getCartKey(userId, guestCartId)}:qty`;

const getProductField = (variantId, size) => `product:${variantId}:${size}`;

const parseProductField = (productField) => {
  const [, variantId, ...sizeParts] = productField.split(":");
  const size = sizeParts.join(":");

  if (!variantId || !size || !mongoose.Types.ObjectId.isValid(variantId)) {
    return null;
  }

  return { variantId, size };
};

const addCartItem = async (userId, guestCartId, item, quantity) => {
  const quantityToAdd = parseInt(quantity, 10);

  if (Number.isNaN(quantityToAdd) || quantityToAdd <= 0) {
    throw createHttpError.BadRequest("Số lượng không hợp lệ");
  }

  const availableStockDB = await getAvailableStockDB(item.variantId, item.size);

  if (availableStockDB === 0)
    throw createHttpError.BadRequest("Sản phẩm đã hết hàng");

  const productKey = getProductField(item.variantId, item.size);
  const cartKeyQty = getCartQtyKey(userId, guestCartId);

  const currentQtyStr = await redisClient.hGet(cartKeyQty, productKey);
  const currentQtyInCart = parseInt(currentQtyStr || "0", 10);

  const newTotalQuantity = currentQtyInCart + quantityToAdd;

  if (newTotalQuantity > availableStockDB) {
    const remainingToAdd = availableStockDB - currentQtyInCart;
    if (remainingToAdd === 0) {
      throw createHttpError.BadRequest("Sản phẩm đã hết hàng");
    }
    throw createHttpError.BadRequest(
      `Bạn chỉ có thể thêm tối đa ${remainingToAdd} sản phẩm nữa.`
    );
  }

  const TTL = userId ? USER_CART_TTL : GUEST_CART_TTL;

  const pipeline = redisClient.multi();
  pipeline.hIncrBy(cartKeyQty, productKey, quantityToAdd);
  pipeline.expire(cartKeyQty, TTL);

  await pipeline.exec();
};

const saveCartQuantitiesToRedis = async (cartItems, qtyKey, TTL) => {
  const pipeline = redisClient.multi();
  pipeline.del(qtyKey);

  for (const item of cartItems) {
    const productKey = getProductField(item.variantId, item.size);
    pipeline.hSet(qtyKey, productKey, item.quantity);
  }

  pipeline.expire(qtyKey, TTL);

  await pipeline.exec();
};

const hydrateCartItems = async (quantities) => {
  const cartRefs = [];
  let shouldRewriteRedis = false;

  for (const [productKey, qty] of Object.entries(quantities)) {
    const parsedProduct = parseProductField(productKey);
    const quantity = parseInt(qty, 10);

    if (!parsedProduct || Number.isNaN(quantity) || quantity <= 0) {
      console.warn(`Invalid cart item in Redis: ${productKey}`);
      shouldRewriteRedis = true;
      continue;
    }

    cartRefs.push({
      productKey,
      quantity,
      ...parsedProduct,
    });
  }

  if (cartRefs.length === 0) {
    return { cartItems: [], shouldRewriteRedis };
  }

  const variantIds = [
    ...new Set(cartRefs.map((item) => item.variantId)),
  ].map((variantId) => new mongoose.Types.ObjectId(variantId));

  const [variants, products] = await Promise.all([
    VariantModel.find({ _id: { $in: variantIds } }).lean(),
    ProductModel.find(
      { variants: { $in: variantIds } },
      { name: 1, slug: 1, variants: 1 }
    ).lean(),
  ]);

  const variantMap = new Map(variants.map((v) => [v._id.toString(), v]));
  const productByVariantId = new Map();

  for (const product of products) {
    for (const variantId of product.variants) {
      productByVariantId.set(variantId.toString(), product);
    }
  }

  const cartItems = [];

  for (const item of cartRefs) {
    const variant = variantMap.get(item.variantId);
    const product = productByVariantId.get(item.variantId);

    if (!variant || !product) {
      console.warn(`Variant ${item.variantId} not found. Removing from cart.`);
      shouldRewriteRedis = true;
      continue;
    }

    const attribute = variant.attributes.find(
      (attr) => attr.size === item.size
    );

    if (!attribute) {
      console.warn(
        `Size '${item.size}' not found for variant ${item.variantId}. Removing.`
      );
      shouldRewriteRedis = true;
      continue;
    }

    cartItems.push({
      variantId: item.variantId,
      name: product.name,
      size: item.size,
      price: variant.price,
      discount: variant.discount,
      color: variant.color,
      image: variant.images[0],
      inStock: attribute.inStock,
      slug: product.slug,
      quantity: item.quantity,
    });
  }

  return { cartItems, shouldRewriteRedis };
};

const loadCart = async (userId, guestCartId) => {
  const isUser = !!userId;
  const qtyKey = getCartQtyKey(userId, guestCartId);
  const TTL = isUser ? USER_CART_TTL : GUEST_CART_TTL;

  const quantities = await redisClient.hGetAll(qtyKey);

  let cartItems = [];

  if (quantities && Object.keys(quantities).length > 0) {
    const result = await hydrateCartItems(quantities);
    cartItems = result.cartItems;

    if (result.shouldRewriteRedis) {
      await saveCartQuantitiesToRedis(cartItems, qtyKey, TTL);
    } else {
      await redisClient.expire(qtyKey, TTL);
    }
  }

  return {
    items: cartItems,
    userId: isUser ? userId : undefined,
    guestCartId: !isUser ? guestCartId : undefined,
  };
};

const mergeCart = async (userId, guestCartId) => {
  if (!userId || !guestCartId) {
    return;
  }

  const userCartKey = `cart:${userId}`;
  const guestCartKey = `cart:${guestCartId}`;

  const userCartQtyKey = `${userCartKey}:qty`;
  const guestCartQtyKey = `${guestCartKey}:qty`;

  const guestCartExists = await redisClient.exists(guestCartQtyKey);
  if (!guestCartExists) {
    await redisClient.del(guestCartKey, guestCartQtyKey);
    return;
  }

  const guestCartQuantities = await redisClient.hGetAll(guestCartQtyKey);

  if (Object.keys(guestCartQuantities).length === 0) {
    await redisClient.del(guestCartKey, guestCartQtyKey);
    return;
  }

  const pipeline = redisClient.multi();
  for (const productKey in guestCartQuantities) {
    const quantity = parseInt(guestCartQuantities[productKey], 10);

    if (!Number.isNaN(quantity) && quantity > 0) {
      pipeline.hIncrBy(userCartQtyKey, productKey, quantity);
    }
  }

  pipeline.expire(userCartQtyKey, USER_CART_TTL);
  pipeline.del(guestCartQtyKey);

  await pipeline.exec();
};

const removeCartItem = async (userId, guestCartId, variantId, size) => {
  const cartKeyQty = getCartQtyKey(userId, guestCartId);
  const productField = getProductField(variantId, size);

  await redisClient.hDel(cartKeyQty, productField);

  const remainingItems = await redisClient.hLen(cartKeyQty);
  if (remainingItems === 0) {
    // Sử dụng UNLINK để xóa không đồng bộ, tránh block Redis server
    await redisClient.unlink(cartKeyQty);
  }
};

const updateCartItem = async (
  userId,
  guestCartId,
  variantId,
  size,
  newQuantity
) => {
  if (Number.isNaN(newQuantity) || newQuantity <= 0) {
    throw createHttpError.BadRequest("Số lượng không hợp lệ");
  }

  const availableStockDB = await getAvailableStockDB(variantId, size);

  if (availableStockDB === 0)
    throw createHttpError.BadRequest("Sản phẩm đã hết hàng");

  const cartKey = userId ? `cart:${userId}` : `cart:${guestCartId}`;
  const cartKeyQty = `${cartKey}:qty`;
  const productKey = getProductField(variantId, size);
  const TTL = userId ? USER_CART_TTL : GUEST_CART_TTL;

  if (newQuantity > availableStockDB) {
    throw createHttpError.BadRequest("Không đủ số lượng để thêm vào giỏ hàng");
  }

  await redisClient
    .multi()
    .hSet(cartKeyQty, productKey, newQuantity)
    .expire(cartKeyQty, TTL)
    .exec();
};

export { addCartItem, loadCart, mergeCart, removeCartItem, updateCartItem };
