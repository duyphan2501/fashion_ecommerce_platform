import CreateError from "http-errors";
import {
  getUserByEmail,
  checkPassword,
  createNewUser,
  getUnverifiedUser,
  hashPassword,
  sendVerificationEmailtoUser,
  sendForgotPasswordEmailtoUser,
  getForgotPasswordUser,
} from "../services/user.service.js";
import { filterFieldUser } from "../helpers/filterField.js";
import UserModel from "../models/user.model.js";
import {
  generateAccessTokenAndSetCookie,
  generateRefreshTokenAndSetCookie,
  verifyRefreshToken,
} from "../helpers/jwt.helper.js";
import { verifyToken } from "../helpers/googleAuth.helper.js";
import { mergeCart } from "../services/cart.service.js";
import UserService from "../services/user.service.js";
import AddressModel from "../models/address.model.js";
import mongoose from "mongoose";

const signUp = async (req, res, next) => {
  try {
    const { email, fullname, address } = req.body;

    if (!email) throw CreateError.BadRequest("Vui lòng nhập email!");

    // check user exist
    const isExistingUser = await getUserByEmail(email);
    if (isExistingUser) {
      if (isExistingUser.isVerified)
        throw CreateError.Conflict("Email đã được sử dụng!");
      return res.status(401).json({
        message:
          "Email đã được đăng ký nhưng chưa xác minh! Vui lòng kiểm tra email để xác minh tài khoản.",
        user: filterFieldUser(isExistingUser),
        success: false,
      });
    }

    if (!fullname) throw CreateError.BadRequest("Vui lòng nhập họ tên!");

    // create new user in db
    const user = await createNewUser(fullname, email, "default");
    if (user && address && address.receiver) {
      await AddressModel.create({ ...address, userId: user._id });
    }

    // send verification email
    await sendVerificationEmailtoUser(user);

    return res.status(201).json({
      message:
        "Đăng ký thành công! Vui lòng kiểm tra email để xác minh tài khoản.",
      user: filterFieldUser(user),
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

const verifyAccount = async (req, res, next) => {
  try {
    const { verificationToken, password, confirmPassword } = req.body;
    if (!verificationToken)
      throw CreateError.BadRequest("Vui lòng cung cấp mã xác minh");

    const foundUser = await getUnverifiedUser(verificationToken);

    if (!foundUser) throw CreateError.NotFound("Mã xác minh không hợp lệ");

    if (foundUser.verificationTokenExpireAt < new Date()) {
      // resend verification email
      await sendVerificationEmailtoUser(foundUser);
      throw CreateError.BadRequest(
        "Mã xác minh đã hết hạn! Chúng tôi đã gửi một email xác minh mới cho bạn.",
      );
    }

    if (!password || !confirmPassword)
      throw CreateError.BadRequest(
        "Vui lòng nhập mật khẩu và xác nhận mật khẩu",
      );
    if (password !== confirmPassword)
      throw CreateError.BadRequest("Mật khẩu và xác nhận mật khẩu không khớp");
    const hashedPassword = await hashPassword(password);
    foundUser.password = hashedPassword;
    foundUser.isVerified = true;
    foundUser.verificationToken = undefined;
    foundUser.verificationTokenExpireAt = undefined;
    await foundUser.save();

    return res.status(200).json({
      message: "Xác thực tài khoản thành công!",
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email) throw CreateError.BadRequest("Vui lòng điền email!");

    const foundUser = await getUserByEmail(email);

    if (!foundUser) throw CreateError.NotFound("Tài khoản không tồn tại");

    if (!foundUser.isVerified) {
      return res.status(401).json({
        message:
          "Tài khoản chưa được xác minh! Vui lòng kiểm tra email để xác minh tài khoản.",
        user: filterFieldUser(foundUser),
        success: false,
        notVerified: true,
      });
    }

    if (foundUser.status === "inactive") {
      return res.status(403).json({
        message:
          "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.",
        success: false,
        isInactive: true,
      });
    }

    if (!password) throw CreateError.BadRequest("Vui lòng điền mật khẩu!");

    const isCorrectPassword = await checkPassword(password, foundUser.password);
    if (!isCorrectPassword)
      throw CreateError.Unauthorized("Mật khẩu không đúng");

    // generate token and set cookie
    const accessToken = await generateAccessTokenAndSetCookie(
      res,
      foundUser._id,
    );
    const refreshToken = await generateRefreshTokenAndSetCookie(
      res,
      foundUser._id,
    );

    // save token in db
    foundUser.refreshToken = refreshToken;
    const expireDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    foundUser.refreshTokenExpireAt = expireDate;
    foundUser.lastLogin = Date.now();
    await foundUser.save();
    const guestCartId = req.cookies.cartId;
    await mergeCart(foundUser._id, guestCartId);
    return res.status(200).json({
      message: "Đăng nhập thành công!",
      accessToken,
      success: true,
      user: filterFieldUser(foundUser),
      isVerified: true,
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    // clear cookie
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    };
    res.clearCookie("accessToken", options);
    res.clearCookie("refreshToken", options);

    // update db
    await UserModel.findByIdAndUpdate(userId, {
      refreshToken: undefined,
      refreshTokenExpireAt: undefined,
    });

    return res.status(200).json({
      message: "Đăng xuất thành công",
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) throw CreateError.BadRequest("Vui lòng nhập email!");

    const foundUser = await getUserByEmail(email);

    if (!foundUser || !foundUser.isVerified)
      throw CreateError.NotFound("Tài khoản không tồn tại");

    await sendForgotPasswordEmailtoUser(foundUser);

    return res.status(200).json({
      message: `Đã gửi email khôi phục mật khẩu đến ${email}`,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, password, confirmPassword } = req.body;
    if (!token) throw CreateError.BadRequest("Thiếu mã khôi phục mật khẩu");

    if (!password) {
      throw CreateError.BadRequest("Vui lòng nhập mật khẩu mới");
    }
    if (!confirmPassword) {
      throw CreateError.BadRequest("Vui lòng nhập mật khẩu xác nhận");
    }

    const foundUser = await UserModel.findOne({
      forgotPasswordToken: token,
    });
    if (!foundUser) throw CreateError.NotFound("Tài khoản không tồn tại");

    // check expire
    if (foundUser.forgotPasswordTokenExpireAt < new Date()) {
      await sendForgotPasswordEmailtoUser(foundUser);
      throw CreateError.BadRequest(
        "Đường dẫn đã hết hạn! Chúng tôi đã gửi đường dẫn mới đến bạn",
      );
    }

    // check confirm password
    if (password !== confirmPassword) {
      throw CreateError.BadRequest("Mật khẩu và mật khẩu xác nhận không khớp");
    }

    // hash and update new password
    const hashedPassword = await hashPassword(password);
    foundUser.password = hashedPassword;

    // clear otp info
    foundUser.forgotPasswordToken = undefined;
    foundUser.forgotPasswordTokenExpireAt = undefined;

    await foundUser.save();

    return res.status(200).json({
      message: "Khôi phục mật khẩu thành công!",
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

const updateUserDetail = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    if (!userId) throw CreateError.Unauthorized("You have to login first");

    const { name, phone } = req.body;

    if (!name || !phone)
      throw CreateError.BadRequest("Name and phone are required");

    const user = await UserModel.findById(userId);

    if (!user) throw CreateError.NotFound("User does not exist");

    if (name !== user.name) user.name = name;
    if (phone !== user.phone) user.phone = phone;

    await user.save();
    return res.status(200).json({
      user: filterFieldUser(user),
      message: "Update user detail successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || error,
      success: false,
    });
  }
};

const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    if (!userId) throw CreateError.Unauthorized("Bạn chưa đăng nhập");

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword)
      throw CreateError.BadRequest("Vui lòng điền đủ các mật khẩu!");

    if (newPassword !== confirmPassword)
      throw CreateError.BadRequest(
        "Mật khẩu mới và mật khẩu xác nhận không khớp!",
      );
    if (newPassword === currentPassword)
      throw CreateError.BadRequest("Mật khẩu mới phải khác mật khẩu cũ!");

    const user = await UserModel.findById(userId);

    if (!user) throw CreateError.NotFound("Tài khoản không tồn tại");

    const isCorrectPassword = await checkPassword(
      currentPassword,
      user.password,
    );

    if (!isCorrectPassword) throw CreateError.Forbidden("Mật khẩu không đúng");

    const hashedNewPassword = await hashPassword(newPassword);

    user.password = hashedNewPassword;
    await user.save();

    return res.status(200).json({
      message: "Đổi mật khẩu thành công",
      success: false,
    });
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) throw CreateError.BadRequest("Refresh token is missing");

    // Verify refresh token
    const payload = await verifyRefreshToken(refreshToken);
    if (!payload || !mongoose.Types.ObjectId.isValid(payload.userId))
      throw CreateError.Unauthorized("Invalid refresh token");
    const userId = payload.userId;

    // Kiểm tra token còn hạn trong DB
    const user = await UserModel.findOne({
      _id: userId,
      refreshToken,
      refreshTokenExpireAt: { $gt: new Date() },
    });

    if (!user)
      throw CreateError.Unauthorized("Invalid or expired refresh token");

    // generate new token
    const accessToken = await generateAccessTokenAndSetCookie(res, user._id);
    const newRefreshToken = await generateRefreshTokenAndSetCookie(
      res,
      user._id,
    );

    // save token in db
    user.refreshToken = newRefreshToken;
    const expireDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    user.refreshTokenExpireAt = expireDate;
    await user.save();

    return res.status(200).json({
      accessToken,
      refreshToken: newRefreshToken,
      user: filterFieldUser(user),
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

const sendVerificationEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw CreateError.BadRequest("Vui lòng cung cấp email!");

    const foundUser = await getUserByEmail(email);
    if (!foundUser) throw CreateError.NotFound("Tài khoản không tồn tại");
    if (foundUser.isVerified)
      throw CreateError.BadRequest("Tài khoản đã được xác minh!");
    await sendVerificationEmailtoUser(foundUser);

    return res.status(200).json({
      message: `Email xác nhận đã gửi đến ${email}`,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

const googleLogin = async (req, res, next) => {
  try {
    const { token } = req.body;
    const payload = await verifyToken(token);

    const user = {
      email: payload.email,
      name: payload.name,
      password: "default",
    };

    let foundUser = await getUserByEmail(user.email);

    if (!foundUser) {
      foundUser = await UserModel.create(user);
    }

    // generate token and set cookie
    const accessToken = await generateAccessTokenAndSetCookie(
      res,
      foundUser._id,
    );
    const refreshToken = await generateRefreshTokenAndSetCookie(
      res,
      foundUser._id,
    );

    // save token in db
    foundUser.refreshToken = refreshToken;
    foundUser.refreshTokenExpireAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    );
    foundUser.lastLogin = Date.now();
    await foundUser.save();

    const guestCartId = req.cookies.cartId;
    await mergeCart(foundUser._id, guestCartId);

    return res.status(200).json({
      message: "Đăng nhập thành công!",
      success: true,
      user: filterFieldUser(foundUser),
      accessToken,
    });
  } catch (error) {
    console.error("Google login error:", error);
    next(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const updatePersonalInfo = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const userId = req.user.userId;

    if (!name) throw CreateError.BadRequest("Vui lòng nhập họ tên");

    if (!userId) throw CreateError.Unauthorized("Bạn chưa đăng nhập");

    const foundUser = await UserModel.findById(userId);
    if (!foundUser) throw CreateError.NotFound("Tài khoản không tồn tại");

    foundUser.name = name;
    foundUser.phone = phone;

    await foundUser.save();

    return res.status(200).json({
      message: `Cập nhật thông tin thành công`,
      user: foundUser,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export {
  signUp,
  verifyAccount,
  login,
  googleLogin,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  updateUserDetail,
  refreshToken,
  sendVerificationEmail,
  updatePersonalInfo,
};

class UserController {
  // GET /api/users - Lấy danh sách users
  async getUsers(req, res) {
    try {
      const result = await UserService.getUsers(req.query);

      return res.status(200).json({
        success: true,
        message: "Lấy danh sách người dùng thành công",
        data: result.users,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("Error in getUsers:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Lỗi khi lấy danh sách người dùng",
      });
    }
  }

  // GET /api/users/:id - Lấy thông tin chi tiết user
  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await UserService.getUserById(id);

      return res.status(200).json({
        success: true,
        message: "Lấy thông tin người dùng thành công",
        data: user,
      });
    } catch (error) {
      console.error("Error in getUserById:", error);
      return res.status(404).json({
        success: false,
        message: error.message || "Không tìm thấy người dùng",
      });
    }
  }

  // POST /api/users - Tạo user mới
  async createUser(req, res) {
    try {
      const newUser = await UserService.createUser(req.body);

      return res.status(201).json({
        success: true,
        message: "Tạo người dùng thành công",
        data: newUser,
      });
    } catch (error) {
      console.error("Error in createUser:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Lỗi khi tạo người dùng",
      });
    }
  }

  // PUT /api/users/:id - Cập nhật thông tin user
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updatedUser = await UserService.updateUser(id, req.body);

      return res.status(200).json({
        success: true,
        message: "Cập nhật người dùng thành công",
        data: updatedUser,
      });
    } catch (error) {
      console.error("Error in updateUser:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Lỗi khi cập nhật người dùng",
      });
    }
  }

  // PATCH /api/users/bulk-update-status - Cập nhật status nhiều users
  async bulkUpdateStatus(req, res) {
    try {
      const { userIds, status } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Danh sách user IDs không hợp lệ",
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng cung cấp trạng thái",
        });
      }

      const result = await UserService.bulkUpdateStatus(userIds, status);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      console.error("Error in bulkUpdateStatus:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Lỗi khi cập nhật trạng thái",
      });
    }
  }

  // GET /api/users/:id/addresses - Lấy danh sách địa chỉ của user
  async getUserAddresses(req, res) {
    try {
      const { id } = req.params;
      const addresses = await UserService.getUserAddresses(id);

      return res.status(200).json({
        success: true,
        message: "Lấy danh sách địa chỉ thành công",
        data: addresses,
      });
    } catch (error) {
      console.error("Error in getUserAddresses:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Lỗi khi lấy danh sách địa chỉ",
      });
    }
  }

  // POST /api/users/:id/addresses - Thêm địa chỉ cho user
  async addAddress(req, res) {
    try {
      const { id } = req.params;
      const newAddress = await UserService.addAddress(id, req.body);

      return res.status(201).json({
        success: true,
        message: "Thêm địa chỉ thành công",
        data: newAddress,
      });
    } catch (error) {
      console.error("Error in addAddress:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Lỗi khi thêm địa chỉ",
      });
    }
  }

  // PUT /api/users/:id/addresses/:addressId - Cập nhật địa chỉ
  async updateAddress(req, res) {
    try {
      const { id, addressId } = req.params;
      const updatedAddress = await UserService.updateAddress(
        addressId,
        id,
        req.body,
      );

      return res.status(200).json({
        success: true,
        message: "Cập nhật địa chỉ thành công",
        data: updatedAddress,
      });
    } catch (error) {
      console.error("Error in updateAddress:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Lỗi khi cập nhật địa chỉ",
      });
    }
  }

  // DELETE /api/users/:id/addresses/:addressId - Xóa địa chỉ
  async deleteAddress(req, res) {
    try {
      const { id, addressId } = req.params;
      const result = await UserService.deleteAddress(addressId, id);

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("Error in deleteAddress:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Lỗi khi xóa địa chỉ",
      });
    }
  }
}

export default new UserController();
