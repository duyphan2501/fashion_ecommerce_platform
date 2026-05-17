import express from "express";
import {
  changePassword,
  forgotPassword,
  login,
  logout,
  refreshToken,
  sendVerificationEmail,
  signUp,
  updateUserDetail,
  verifyAccount,
  googleLogin,
  resetPassword,
  updatePersonalInfo,
} from "../controllers/user.controller.js";
import checkAuth from "../middlewares/auth.middleware.js";
import UserController from "../controllers/user.controller.js";

const userRouter = express.Router();

userRouter.post("/sign-up", signUp);
userRouter.put("/verify-account", verifyAccount);
userRouter.post("/login", login);
userRouter.post("/login/google", googleLogin);
userRouter.delete("/logout", checkAuth, logout);
userRouter.post("/forgot-password", forgotPassword);
userRouter.put("/reset-password", resetPassword);
userRouter.put("/change-password", checkAuth, changePassword);
userRouter.put("/profile/update", checkAuth, updateUserDetail);
userRouter.put("/refresh-token", refreshToken);
userRouter.put("/resend-verification-email", sendVerificationEmail);
userRouter.put("/personal-info/update", checkAuth, updatePersonalInfo);

userRouter.get("/", UserController.getUsers);
userRouter.post("/", UserController.createUser);
userRouter.patch("/bulk-update-status", UserController.bulkUpdateStatus);
userRouter.get("/:id/addresses", UserController.getUserAddresses);
userRouter.post("/:id/addresses", UserController.addAddress);
userRouter.put("/:id/addresses/:addressId", UserController.updateAddress);
userRouter.delete("/:id/addresses/:addressId", UserController.deleteAddress);
userRouter.put("/:id", UserController.updateUser);
userRouter.get("/:id", UserController.getUserById);

export default userRouter;
