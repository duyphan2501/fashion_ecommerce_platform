import { X, ArrowRight } from "lucide-react";
import Recommendations from "../ProductRecommendations";
import EmptyCart from "../EmptyCart";
import useCartStore from "../../store/useCartStore";
import QuantityButton from "../QuantityButton.jsx";
import useUserStore from "../../store/useUserStore.js";
import { getDiscountedPrice } from "../../utils/formatMoney.js";
import { calculateTotal } from "../../utils/calculatePrice.js";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const CartWithItems = ({}) => {
  const cartItems = useCartStore((state) => state.cartItems);
  const deleteItem = useCartStore((state) => state.deleteItem);
  const updateCartItem = useCartStore((state) => state.updateCartItem);
  const user = useUserStore((state) => state.user);

  const handleRemoveItem = async (variantId, size) => {
    await deleteItem(user?._id, variantId, size);
  };

  const handleQuantityChange = async (variantId, size, quantity) => {
    await updateCartItem(user?._id, variantId, size, quantity);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN").format(price) + "₫";
  };

  const navigator = useNavigate();

  const handleNavToPayment = () => {
    cartItems.forEach((item) => {
      const name = `${item.name} - ${item.color}`;
      if (item.inStock === 0) {
        toast.error(`Sản phẩm ${name}, size ${item.size} đã hết hàng.`);
        return;
      }

      if (item.inStock < item.quantity) {
        toast.error(
          `Không đủ hàng cho ${name}, size ${item.size}. Chỉ còn: ${attribute.inStock}`
        );
        return;
      }
      navigator("/checkout");
    });
  };

  const total = calculateTotal(cartItems);

  if (!cartItems || cartItems.length === 0) {
    return <EmptyCart />;
  }

  return (
    <div className="min-h-screen bg-white-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items Section */}

          <div className="lg:col-span-2">
            <div className="bg-gray-200 p-4 mb-6">
              <p className="text-2xl font-semibold">
                XIN CHÀO{user && ", " + user?.name}!
              </p>
            </div>

            <div className="bg-white md:p-6 mb-6">
              <h2 className="text-4xl font-bold mb-2">GIỎ HÀNG CỦA BẠN</h2>
              <p className="text-xl mb-4">
                TỔNG CỘNG ({cartItems.length} sản phẩm){" "}
                <strong className="money">{formatPrice(total)}</strong>
              </p>

              {/* Cart Items */}
              {cartItems.map((item) => {
                const price = item.price;
                const discount = item.discount || 0;

                const { formatedPrice, formatedDiscountedPrice } =
                  getDiscountedPrice(price, discount);

                let actualDiscountedPrice = price * (1 - discount / 100);
                actualDiscountedPrice =
                  Math.round(actualDiscountedPrice / 1000) * 1000;
                return (
                  <div
                    key={item.variantId}
                    className="flex gap-4 p-4 border border-gray-300 mb-4 bg-white "
                  >
                    <div className="w-[150px] h-[150px] relative">
                      <img
                        src={`${import.meta.env.VITE_API_URL}/${item.image}`}
                        alt={item.name}
                        className="size-full object-cover flex-shrink-0"
                      />
                      {item.inStock === 0 && (
                        <div className="size-full bg-black/30 flex items-center inset-0 absolute justify-center">
                          <p className="p-1 rounded-md bg-white text-red-500 title uppercase font-semibold">
                            Hết hàng
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col justify-between flex-1">
                      <h3 className=" font-semibold mb-1 md:text-xl line-clamp-2">
                        {item.name} - {item.color}
                      </h3>
                      <div className="flex justify-between">
                        <div className="flex flex-col justify-between gap-1">
                          <p className="text-sm ">KÍCH CỠ: {item.size}</p>
                          <div>
                            {discount === 0 ? (
                              <p className="font-bold money">
                                {formatedDiscountedPrice}
                              </p>
                            ) : (
                              <>
                                <p className="text-secondary font-bold text-lg money">
                                  {formatedDiscountedPrice}
                                </p>
                                <span className="rounded-lg bg-gray-100 text-sm text-black p-1">
                                  -{discount}%
                                </span>
                                <span className="ml-2 text-[13px] line-through align-text-top money">
                                  {formatedPrice}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* <div className="flex items-center gap-4 mt-auto">
                      <select
                        value={item.quantity}
                        onChange={(e) =>
                          handleQuantityChange(item.id, e.target.value)
                        }
                        className="px-3 py-2 border border-gray-300 rounded text-sm"
                      >
                        {[1, 2, 3, 4, 5].map((num) => (
                          <option key={num} value={num}>
                            {num}
                          </option>
                        ))}
                      </select>
                    </div> */}
                      <QuantityButton
                        value={item.quantity}
                        onChange={(value) =>
                          handleQuantityChange(item.variantId, item.size, value)
                        }
                      />
                    </div>
                    <div className="flex flex-col items-end">
                      <button
                        className="p-2 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                        onClick={() =>
                          handleRemoveItem(item.variantId, item.size)
                        }
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Summary Section */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 sticky top-5">
              <h3 className="text-2xl font-bold mb-4">TÓM TẮT ĐƠN HÀNG</h3>

              <div className="flex justify-between mb-2">
                <span>{cartItems.length} sản phẩm</span>
                <span className="money">{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Giao hàng</span>
                <span>Miễn phí</span>
              </div>

              <hr className="border-t border-gray-300 my-4" />

              <div className="flex justify-between text-xl font-bold">
                <span>Tổng</span>
                <span className="money">{formatPrice(total)}</span>
              </div>

              <p className="text-xs text-gray-600 mb-4">(Đã bao gồm thuế)</p>

              <button
                className="w-full bg-black text-white py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors cursor-pointer"
                onClick={handleNavToPayment}
              >
                TIẾN HÀNH THANH TOÁN <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
        <Recommendations />
      </div>
    </div>
  );
};

export default CartWithItems;
