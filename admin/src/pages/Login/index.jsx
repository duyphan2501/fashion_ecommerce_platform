import React, { useState } from "react";
import adminBackground from "../../assets/images/admin_bg.jpg";
import { MyContext } from "../../context/MyContext";
import useUserStore from "../../../stores/useUserStore";
import BiLoader from "../../components/BiLoader";
// Import các component của MUI
import {
  Container,
  Box,
  Avatar,
  Typography,
  TextField,
  Button,
  CssBaseline,
  FormControlLabel,
  Checkbox,
} from "@mui/material";

// Import icon từ MUI
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import GoogleIcon from "@mui/icons-material/Google"; // Thêm icon Google
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import GoogleLoginButton from "../../components/GoogleLoginButton";

const Login = () => {
  const navigator = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { persist, setPersist } = useContext(MyContext);
  const [isLogin, setIsLogin] = useState(false);
  const { login } = useUserStore();

  const handleSubmit = async (event) => {
    event.preventDefault();

    setIsLogin(true);
    const isAdminLogin = await login({ email, password });
    setIsLogin(false);

    if (isAdminLogin) {
      navigator("/");
    }
  };

  const handleGoogleLogin = () => {
    console.log("Đăng nhập bằng Google");
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-cover bg-center">
      <div className="absolute inset-0  opacity-50">
        <img
          src={adminBackground}
          className="object-cover w-full h-full"
          alt=""
        />
      </div>

      <Container component="main" maxWidth="xs" className="relative z-10">
        {" "}
        <CssBaseline />
        <Box
          className="bg-white p-8 rounded-lg shadow-2xl"
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: "#990000" }}>
            <LockOutlinedIcon />
          </Avatar>

          <Typography component="h1" variant="h5">
            Admin Đăng Nhập
          </Typography>

          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ mt: 3, width: "100%" }}
          >
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* Checkbox "Remember me" */}
            <FormControlLabel
              control={
                <Checkbox
                  value="remember"
                  color="primary"
                  checked={persist}
                  onChange={(e) => {
                    setPersist(e.target.checked);
                    localStorage.setItem("persist", e.target.checked);
                  }}
                />
              }
              label="Remember me"
            />

            {/* Nút Đăng nhập */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              {!isLogin ? "ĐĂNG NHẬP" : <BiLoader size={20} />}
            </Button>

            {/* Nút Đăng nhập bằng Google */}

            <div className="w-full flex justify-center">
              <GoogleLoginButton />
            </div>
          </Box>
        </Box>
      </Container>
    </div>
  );
};

export default Login;
