import express from "express";
import cookieParser from "cookie-parser";
import errorHandeler from "./middlewares/errorHandler.middleware.js";
import dotenv from "dotenv";
import userRouter from "./routes/user.route.js";
import connectToDB from "./database/connectMongoDB.js";
import cors from "cors";
import categoryRouter from "./routes/category.route.js";
import path from "path";
import cartRouter from "./routes/cart.route.js";
import couponRouter from "./routes/coupon.route.js";
import productRouter from "./routes/product.route.js";
import visitRouter from "./routes/visit.route.js";
import orderRouter from "./routes/order.route.js";
import evaluationRouter from "./routes/evaluation.route.js";
import http from "http";
import { initSocket } from "./config/socket.config.js";

import { startNgrokAndConfirmWebhook } from "./config/payos.init.js";
import addressRouter from "./routes/address.route.js";

dotenv.config({ quiet: true });

const app = express();

const server = http.createServer(app);

initSocket(server);

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: [process.env.CLIENT_URL, process.env.ADMIN_URL],
    credentials: true,
  })
);

app.get("/ping", (req, res) => {
  res.status(200).send("ok");
});
//routes
app.use("/api/user", userRouter);
app.use("/api/category", categoryRouter);
app.use("/api/cart", cartRouter);
app.use("/api/order", orderRouter);
app.use("/api/product", productRouter);
app.use("/api/visit", visitRouter);
app.use("/api/address", addressRouter);
app.use("/api/evaluation", evaluationRouter);

app.use("/api/coupon", couponRouter);

app.use(errorHandeler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server is running at PORT :::", PORT);
  connectToDB();

  startNgrokAndConfirmWebhook();
});
