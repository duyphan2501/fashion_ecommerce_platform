import UspHeader from "./USPHeader";
import Header from "./Header";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import Footer from "../components/Footer";
import { toast } from "react-toastify";
import { MyContext } from "../Context/MyContext";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import useUserStore from "../store/useUserStore";
import useCartStore from "../store/useCartStore";
import useAddressStore from "../store/useAddressStore";
import useTrackVisit from "../hooks/useTrackVisit";

const Layouts = () => {
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { refreshToken } = useUserStore();
  const { persist } = useContext(MyContext);
  const navigator = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  const axiosPrivate = useAxiosPrivate();
  const user = useUserStore((state) => state.user);
  const getCart = useCartStore((state) => state.getCart);
  const getAllAddresses = useAddressStore((state) => state.getAllAddresses);

  useEffect(() => {
    getCart(user?._id);
  }, [user, getCart]);

  useEffect(() => {
    if (!user) return;
    const fetchAddresses = async () => {
      try {
        await getAllAddresses(axiosPrivate);
      } catch (error) {
        console.error("Error fetching addresses:", error);
      }
    };
    fetchAddresses();
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > lastScrollY && window.scrollY > 100) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }
      setLastScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    let isMounted = true;
    const refresh = async () => {
      if (user || !persist) {
        setIsLoading(false);
        return;
      }
      try {
        await refreshToken();
      } catch (error) {
        if (
          isMounted &&
          ["/addresses", "/my-account"].includes(location.pathname)
        ) {
          toast.info("Bạn cần phải đăng nhập trước!");
          navigator("/login", { replace: true });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    refresh();
    return () => {
      isMounted = false;
    };
  }, []);

  useTrackVisit(user?.id);

  return (
    <>
      {isLoading ? (
        <>
          <div className="fixed inset-0 z-50  opacity-30"></div>
          <div className="fixed inset-0 z-60 bg-white flex items-center justify-center">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="size-20 border-6 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-700">Đang tải thông tin...</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col min-h-screen">
          <div
            className={`sticky top-0 z-50 transition-transform duration-300 ease-in-out 
            ${showHeader ? "translate-y-0" : "-translate-y-full"}`}
          >
            <UspHeader />
            <Header />
          </div>

          <main className="grow">
            <Outlet />
          </main>

          <Footer />
        </div>
      )}
    </>
  );
};

export default Layouts;
