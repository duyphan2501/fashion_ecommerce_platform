import { useEffect, useState, useContext } from "react";
import useUserStore from "../../stores/useUserStore";
import { MyContext } from "../context/MyContext";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const Layouts = () => {
  const [isLoading, setIsLoading] = useState(true);
  const user = useUserStore((s) => s.user);
  const { refreshToken } = useUserStore();
  const { persist } = useContext(MyContext);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      if (user) {
        setIsLoading(false);
        return;
      }

      if (persist) {
        try {
          await refreshToken();
        } catch (error) {
          if (isMounted) {
            toast.info("Bạn cần đăng nhập trước!");
            navigate("/login", { replace: true });
          }
        } finally {
          if (isMounted) setIsLoading(false);
        }
      } else {
        if (isMounted) {
          toast.info("Bạn cần đăng nhập trước!");
          navigate("/login", { replace: true });
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [user, persist, refreshToken, navigate]);

  return (
    <>
      {isLoading || !user ? (
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
          <main className="flex-grow">
            <Outlet />
          </main>
        </div>
      )}
    </>
  );
};

export default Layouts;
