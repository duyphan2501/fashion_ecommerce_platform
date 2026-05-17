import { create } from "zustand";
import { toast } from "react-toastify";
import axiosCustom from "../API/axiosInstance";
import axiosPrivate from "../API/axiosPrivate";

const useUserStore = create((set, get) => {
  const setUser = (user, accessToken = null) => {
    set({ user, accessToken });
  };

  const login = async (user) => {
    try {
      const res = await axiosCustom.post(`/api/user/login`, user);
      toast.success(res.data.message);
      if (res.data.user.isAdmin) {
        set({
          user: res.data.user,
          accessToken: res.data.accessToken,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || "Đăng nhập thất bại");
    }
  };

  const refreshToken = async () => {
    try {
      const res = await axiosCustom.put(`/api/user/refresh-token`);
      set({
        user: res.data.user,
        accessToken: res.data.accessToken,
      });
      return { accessToken: res.data.accessToken };
    } catch (error) {
      set({
        user: null,
        accessToken: null,
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await axiosCustom.delete("/api/user/logout", {
        data: { user: get().user },
      });
    } catch (error) {
      console.log(error);
    } finally {
      set({ user: null, accessToken: null });
    }
  };

  const getUsers = async () => {
    try {
      const result = await axiosPrivate.get("/api/user/");
      if (result.data.success) {
        set(() => ({ users: result.data.data }));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return {
    user: null,
    accessToken: null,
    users: [],
    login,
    refreshToken,
    setUser,
    logout,
    getUsers,
  };
});

export default useUserStore;
