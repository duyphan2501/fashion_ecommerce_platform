import React, { useState, useEffect } from "react";
import { Package, Truck, Clock, Loader2, X, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useOrderAPI from "../../hooks/useOrder";
const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const navigate = useNavigate();

  const { getActiveOrders, getOrdersByStatus, cancelOrder } = useOrderAPI();

  useEffect(() => {
    fetchOrders();
  }, [selectedStatus]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      let result;

      if (selectedStatus === "all") {
        result = await getActiveOrders();
      } else {
        result = await getOrdersByStatus(selectedStatus);
      }

      // Lọc chỉ lấy đơn hàng đang xử lý (không bao gồm delivered và cancelled)
      const activeOrders = result.data.filter(
        (order) => order.status !== "delivered" && order.status !== "cancelled"
      );
      setOrders(activeOrders);
    } catch (err) {
      setError(err.message || "Không thể tải đơn hàng");
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const openCancelModal = (e, order) => {
    e.stopPropagation();
    setOrderToCancel(order);
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    setShowCancelModal(false);
    setOrderToCancel(null);
  };

  const confirmCancelOrder = async () => {
    if (!orderToCancel) return;

    try {
      setCancellingOrderId(orderToCancel.id);
      await cancelOrder(orderToCancel.id);

      // Xóa đơn hàng khỏi danh sách sau khi hủy thành công
      setOrders(orders.filter((order) => order.id !== orderToCancel.id));

      closeCancelModal();
    } catch (err) {
      setError(err.message || "Không thể hủy đơn hàng. Vui lòng thử lại!");
      console.error("Error cancelling order:", err);
    } finally {
      setCancellingOrderId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "shipping":
        return "bg-blue-100 text-blue-800";
      case "confirmed":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-orange-100 text-orange-800";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "shipping":
        return <Truck className="w-5 h-5 text-blue-600" />;
      case "confirmed":
        return <Package className="w-5 h-5 text-purple-600" />;
      default:
        return <Clock className="w-5 h-5 text-orange-600" />;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const getStatusCount = (status) => {
    return orders.filter((o) => o.status === status).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cancel Confirmation Modal */}
      {showCancelModal && orderToCancel && (
        <div className="fixed inset-0 bg-black/29 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fadeIn">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Xác nhận hủy đơn hàng
              </h3>
            </div>

            <div className="mb-6 space-y-3">
              <p className="text-gray-700">
                Bạn có chắc chắn muốn hủy đơn hàng này?
              </p>

              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Mã đơn hàng:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {orderToCancel.id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Tổng tiền:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(orderToCancel.total)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Số sản phẩm:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {orderToCancel.products.length} sản phẩm
                  </span>
                </div>
              </div>

              <p className="text-sm text-red-600 font-medium">
                ⚠️ Hành động này không thể hoàn tác!
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeCancelModal}
                disabled={cancellingOrderId === orderToCancel.id}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Không, giữ lại
              </button>
              <button
                onClick={confirmCancelOrder}
                disabled={cancellingOrderId === orderToCancel.id}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {cancellingOrderId === orderToCancel.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang hủy...
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    Có, hủy đơn
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold">
            Đơn hàng đang xử lý
          </h2>

          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded font-semibold bg-white hover:bg-gray-50 cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Đang chờ xử lý</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="shipping">Đang vận chuyển</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <p className="text-2xl font-bold text-orange-600">
              {getStatusCount("pending")}
            </p>
            <p className="text-sm text-gray-600">Chờ xử lý</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <p className="text-2xl font-bold text-purple-600">
              {getStatusCount("confirmed")}
            </p>
            <p className="text-sm text-gray-600">Đã xác nhận</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <p className="text-2xl font-bold text-blue-600">
              {getStatusCount("shipping")}
            </p>
            <p className="text-sm text-gray-600">Đang vận chuyển</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Orders List */}
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-xl font-semibold text-gray-600">
                Không có đơn hàng nào
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-black"
                onClick={() => navigate(`/api/order/${order.id}`)}
              >
                <div className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(order.status)}
                          <h3 className="font-bold text-xl">{order.id}</h3>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold w-fit ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.currentStatus}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mb-3">
                        <p>
                          Ngày đặt:{" "}
                          <span className="font-semibold">
                            {order.date} {order.time}
                          </span>
                        </p>
                        {order.estimatedDelivery && (
                          <p>
                            Dự kiến giao:{" "}
                            <span className="font-semibold">
                              {order.estimatedDelivery}
                            </span>
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        {order.products.map((product, idx) => (
                          <p key={idx} className="text-sm text-gray-700">
                            • {product.name}{" "}
                            <span className="text-gray-500">
                              (x{product.quantity})
                            </span>
                          </p>
                        ))}
                      </div>
                    </div>
                    <div className="text-left md:text-right flex md:flex-col justify-between md:justify-start items-center md:items-end gap-2">
                      <div>
                        <p className="text-sm text-gray-600 uppercase">
                          Tổng tiền
                        </p>
                        <p className="font-bold text-2xl">
                          {formatCurrency(order.total)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {order.products.length} sản phẩm
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {/* Nút Hủy đơn - chỉ hiện khi status = pending */}
                        {order.status === "pending" && (
                          <button
                            onClick={(e) => openCancelModal(e, order)}
                            className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700 transition-colors text-sm whitespace-nowrap flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            HỦY ĐƠN
                          </button>
                        )}

                        {/* Nút Theo dõi */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/api/order/${order.id}`);
                          }}
                          className="bg-black text-white px-4 py-2 rounded font-bold hover:bg-gray-800 transition-colors text-sm whitespace-nowrap"
                        >
                          THEO DÕI
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderList;
