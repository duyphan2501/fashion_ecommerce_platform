import React, { useState, useEffect } from "react";
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  CreditCard,
  Loader2,
} from "lucide-react";
import { useParams } from "react-router-dom";
import useOrderAPI, { useAutoUpdateOrder } from "../../hooks/useOrder";

const OrderTracking = () => {
  const { orderId } = useParams();
  const [currentOrder, setCurrentOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { getOrderById } = useOrderAPI();

  // Auto-update order status mỗi 1 phút
  const { isRunning } = useAutoUpdateOrder(orderId, (updatedOrder) => {
    setCurrentOrder(updatedOrder);
  });

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getOrderById(orderId);
      console.log(result);
      setCurrentOrder(result.data);
    } catch (err) {
      setError(err.message || "Không thể tải thông tin đơn hàng");
      console.error("Error fetching order:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case "shipping":
        return <Truck className="w-6 h-6 text-blue-600" />;
      case "confirmed":
        return <Package className="w-6 h-6 text-purple-600" />;
      default:
        return <Clock className="w-6 h-6 text-orange-600" />;
    }
  };

  const getStatusColorClass = (status) => {
    switch (status) {
      case "delivered":
        return "bg-green-50 border-green-500";
      case "shipping":
        return "bg-blue-50 border-blue-500";
      case "confirmed":
        return "bg-purple-50 border-purple-500";
      default:
        return "bg-orange-50 border-orange-500";
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  if (error || !currentOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-xl font-semibold text-gray-600">
            {error || "Không tìm thấy đơn hàng"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">

        {/* Thông tin đơn hàng */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-5 h-5 text-gray-600" />
              <h3 className="font-bold text-sm uppercase">Ngày đặt hàng</h3>
            </div>
            <p className="text-lg font-semibold">{currentOrder.date}</p>
            <p className="text-sm text-gray-600">{currentOrder.time}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Truck className="w-5 h-5 text-gray-600" />
              <h3 className="font-bold text-sm uppercase">
                {currentOrder.deliveryDate ? "Đã giao" : "Dự kiến giao hàng"}
              </h3>
            </div>
            <p className="text-lg font-semibold">
              {currentOrder.deliveryDate ||
                currentOrder.estimatedDelivery ||
                "Đang cập nhật"}
            </p>
            <p className="text-sm text-gray-600">Giao hàng tiêu chuẩn</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Package className="w-5 h-5 text-gray-600" />
              <h3 className="font-bold text-sm uppercase">Tổng tiền</h3>
            </div>
            <p className="text-lg font-bold">
              {formatCurrency(currentOrder.total)}
            </p>
            <p className="text-sm text-gray-600">
              {currentOrder.paymentMethod}
            </p>
          </div>
        </div>

        {/* Trạng thái đơn hàng */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="font-bold text-xl mb-6 uppercase">
            Trạng thái đơn hàng
          </h3>

          <div
            className={`flex items-center gap-4 p-5 rounded-lg border-l-4 ${getStatusColorClass(
              currentOrder.status
            )}`}
          >
            {getStatusIcon(currentOrder.status)}
            <div className="flex-1">
              <p className="font-bold text-lg">{currentOrder.currentStatus}</p>
              <p className="text-sm text-gray-600 mt-1">
                {currentOrder.status === "pending" &&
                  "Đơn hàng đã được đặt thành công và đang chờ xác nhận"}
                {currentOrder.status === "confirmed" &&
                  "Đơn hàng đã được xác nhận và đang chuẩn bị"}
                {currentOrder.status === "shipping" &&
                  "Đơn hàng đang trên đường giao đến bạn"}
                {currentOrder.status === "delivered" &&
                  "Đơn hàng đã được giao thành công"}
              </p>
            </div>
          </div>
        </div>

        {/* Sản phẩm */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="font-bold text-xl mb-4 uppercase">Sản phẩm</h3>
          <div className="space-y-4">
            {currentOrder.products.map((product, idx) => (
              <div
                key={idx}
                className="flex gap-4 pb-4 border-b last:border-b-0"
              >
                <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center shrink-0">
                  {product.image ? (
                    <img
                      src={`${import.meta.env.VITE_API_URL}/${product.image}`}
                      alt={product.name}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <span className="text-3xl">👟</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg mb-1">{product.name}</p>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Màu sắc: {product.color}</p>
                    {product.size && <p>Size: {product.size}</p>}
                    <p>Số lượng: {product.quantity}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">
                    {formatCurrency(product.price)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t-2 border-gray-200">
            <div className="flex justify-between items-center">
              <p className="font-bold text-lg">TỔNG CỘNG:</p>
              <p className="font-bold text-2xl">
                {formatCurrency(currentOrder.total)}
              </p>
            </div>
          </div>
        </div>

        {/* Thông tin giao hàng */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-5 h-5 text-gray-600" />
              <h3 className="font-bold uppercase">Địa chỉ giao hàng</h3>
            </div>
            <div className="space-y-2 text-gray-700">
              <p className="font-semibold">
                {currentOrder.shippingAddress.name}
              </p>
              <p>{currentOrder.shippingAddress.phone}</p>
              <p>{currentOrder.shippingAddress.address}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-5 h-5 text-gray-600" />
              <h3 className="font-bold uppercase">Phương thức thanh toán</h3>
            </div>
            <p className="text-gray-700">{currentOrder.paymentMethod}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
