import createHttpError from "http-errors";
import {
  addCartItem,
  loadCart,
  removeCartItem,
  updateCartItem,
} from "../services/cart.service.js";
import { v4 as uuidv4 } from "uuid";
import { getCookieOptions } from "../helpers/cookie.helper.js";

const addToCart = async (req, res, next) => {
  try {
    const { item, quantity, userId } = req.body;
    let { cartId } = req.cookies;

    if (!item || !quantity) {
      throw createHttpError.BadRequest("Thiếu biến thể hoặc số lượng");
    }

    if (userId) {
    } else {
      if (!cartId) {
        cartId = uuidv4();
        res.cookie(
          "cartId",
          cartId,
          getCookieOptions({
            maxAge: 4 * 24 * 60 * 60 * 1000,
          })
        );
      }
    }
    // đặt chỗ
    // const { changed } = await reserveStock(userId, cartId, variantId, quantity);

    // cập nhật giỏ trong Redis
    await addCartItem(userId, cartId, item, quantity);

    // const outOfStockQty = quantity - changed;
    // if (outOfStockQty !== 0)
    //   return res.status(400).json({
    //     message: `Out of stock!${changed !== 0 ? `Quantity increases only ${changed}` : ""}`,
    //     success: false,
    //   });

    return res.status(200).json({
      message: "Đã thêm vào giỏ hàng!",
      success: true,
      cart: await loadCart(userId, cartId),
    });
  } catch (error) {
    next(error);
  }
};

const getCart = async (req, res, next) => {
  try {
    let { userId } = req.params;
    if (userId === "guest") userId = null;
    let guestCartId = req.cookies.cartId;

    const cart =
      userId || guestCartId ? await loadCart(userId, guestCartId) : [];

    return res
      .status(200)
      .json({ cart, message: "Tải giỏ hàng thành công", success: true });
  } catch (error) {
    next(error);
  }
};

const removeFromCart = async (req, res, next) => {
  try {
    const { userId, variantId, size } = req.body;
    if (!variantId || !size) {
      throw createHttpError.BadRequest("Thiếu mã biến thể hoặc size");
    }
    const guestCartId = req.cookies.cartId;
    if (!userId && !guestCartId)
      throw createHttpError.BadRequest("Không tìm thấy giỏ hàng");

    await removeCartItem(userId, guestCartId, variantId, size);
    // await cancelStockReservation(userId, cartId, modelId);

    return res.status(200).json({
      message: "Đã xoá khỏi giỏ hàng",
      success: true,
      cart: await loadCart(userId, guestCartId),
    });
  } catch (error) {
    next(error);
  }
};

const updateCart = async (req, res, next) => {
  try {
    const { userId, variantId, size, quantity } = req.body;
    if (!variantId || !size || !quantity) {
      throw createHttpError.BadRequest(
        "Thiếu mã biến thể hoặc size hoặc số lượng"
      );
    }
    const newQuantity = parseInt(quantity, 10);
    const guestCartId = req.cookies.cartId;
    if (!userId && !guestCartId)
      throw createHttpError.BadRequest("Không tìm thấy giỏ hàng");

    await updateCartItem(userId, guestCartId, variantId, size, newQuantity);

    return res.status(200).json({
      message: "Cập nhật thành công",
      success: true,
      cart: await loadCart(userId, guestCartId),
    });
  } catch (error) {
    next(error);
  }
};

export { addToCart, getCart, removeFromCart, updateCart };
