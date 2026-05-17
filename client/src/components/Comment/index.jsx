import { Button, Rating, Stack, TextField } from "@mui/material";
import CommentCard from "../CommentCard";
import useEvaluationStore from "../../store/useEvaluationStore";
import io from "socket.io-client";
import { useState } from "react";
import { useEffect } from "react";
import useUserStore from "../../store/useUserStore";
import { toast } from "react-toastify";
import ConfirmDialog from "../ConfirmDialog.jsx";
import StarCard from "../StarCard/index.jsx";

const socket = io(import.meta.env.VITE_API_URL || "http://localhost:3000");

// const comment = {
//   avatar: "https://ecommerce-frontend-view.netlify.app/user.jpg",
//   name: "Duy Phan",
//   date: "2023-10-04",
//   comment: "Best product",
//   rating: 5,
// };

const Comment = ({ product }) => {
  const evaluations = useEvaluationStore((state) => state.evaluations);
  const user = useUserStore((state) => state.user);

  const setEvaluations = useEvaluationStore((state) => state.setEvaluations);

  const [commentText, setCommentText] = useState("");
  const [userName, setUsername] = useState("");
  const [ratingValue, setRatingValue] = useState(5);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmRate, setConfirmRate] = useState(false);
  const [alreadyAdded, setAlreadyAdded] = useState(false);

  const handleSendComment = () => {
    setConfirmOpen(false);
    if (commentText.trim() === "") return;

    socket.emit("newComment", {
      userName: user?.name || userName,
      comment: commentText,
      // rating: ratingValue,
      createdAt: new Date().toISOString(),
      productId: product._id,
    });
  };

  const handleSendRating = () => {
    setConfirmRate(false);
    if (ratingValue === 0) return;

    socket.emit("newRating", {
      userName: user?.name || userName,
      rating: ratingValue,
      createdAt: new Date().toISOString(),
      productId: product._id,
    });
  };

  useEffect(() => {
    socket.on("commentAdded", (newComment) => {
      setEvaluations((prev) => [...prev, newComment]);
    });
    socket.on("commentError", (error) => {
      toast.error(error.message);
    });
    socket.on("ratingAdded", (newComment) => {
      setEvaluations((prev) => [...prev, newComment]);
    });
    socket.on("ratingError", (error) => {
      toast.error(error.message);
    });

    return () => {
      socket.off("commentAdded");
      socket.off("commentError");
      socket.off("ratingAdded");
      socket.off("ratingError");
    };
  }, []);

  useEffect(() => {
    if (user) {
      const hasAdded = evaluations.some(
        (e) => e.userName === user.name && Number.isFinite(e.rating)
      );
      setAlreadyAdded(hasAdded);
    }
  }, [evaluations, user]);

  return (
    <div>
      <ConfirmDialog
        onConfirm={handleSendComment}
        content={
          "Bạn có muốn đăng đánh giá này? Bạn sẽ không thể sửa đổi sau khi đã đăng."
        }
        action={"Đồng ý"}
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
      />

      <ConfirmDialog
        onConfirm={handleSendRating}
        content={
          "Bạn có muốn đăng đánh giá này? Bạn sẽ không thể sửa đổi sau khi đã đăng."
        }
        action={"Đồng ý"}
        open={confirmRate}
        onClose={() => setConfirmRate(false)}
      />
      <div className="shadow rounded p-5">
        <div className="grid grid-cols-3 gap-3">
          {evaluations.filter((e) => e.rating).length > 0 ? (
            evaluations
              .filter((e) => e.rating) // chỉ lấy những thằng có rating
              .map((evaluation, index) => (
                <StarCard key={index} starRateData={evaluation} />
              ))
          ) : (
            <p className="text-center text-gray-500">
              Không có lượt đánh giá nào
            </p>
          )}
        </div>

        <div className="border-b borday-gray-300"></div>

        {user && !alreadyAdded && (
          <div className="my-3 w-full flex flex-col justify-center items-center">
            <h1 className="text-lg capitalize font-bold">
              Đánh giá sản phẩm này
            </h1>

            <Stack spacing={1} className="mt-2">
              <Rating
                size="medium"
                name="half-rating"
                precision={0.5}
                value={ratingValue}
                onChange={(e) => setRatingValue(Number(e.target.value))}
              />
            </Stack>

            <Button
              sx={{
                marginTop: "10px",
                bgcolor: "black",
                color: "white",
                fontWeight: "600",
                "&:hover": { bgcolor: "gray.700" },
                "&.Mui-disabled": {
                  bgcolor: "gray.400",
                  color: "#fff",
                  opacity: 0.7,
                },
              }}
              onClick={() => setConfirmRate(true)}
            >
              Rate
            </Button>
          </div>
        )}
      </div>
      <div className="shadow rounded p-5">
        <div className="">
          <h3 className="font-bold text-lg uppercase">
            Đánh giá từ khách hàng
          </h3>
          <div className="p-2 max-h-[400px] overflow-y-scroll">
            {evaluations.length === 0 ? (
              <div>Chưa có đánh giá nào</div>
            ) : (
              evaluations
                ?.filter((evaluation) => !evaluation.rating)
                .map((evaluation) => (
                  <CommentCard key={evaluation._id} comment={evaluation} />
                ))
            )}
          </div>
        </div>
        <div className="p-3 shadow rounded bg-gray-100 my-5">
          <h4 className="text-lg font-bold mb-3">Bình luận</h4>
          <TextField
            id="outline"
            variant="outlined"
            className="bg-white w-1/2"
            label="Username"
            sx={{
              marginBottom: "15px",
            }}
            value={user ? user?.name : userName}
            disabled={user ? true : false}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            id="outlined-basic"
            label="Viết gì đó..."
            variant="outlined"
            className="bg-white w-full mt-3"
            multiline={true}
            rows={4}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          {/* <div className="my-3">
            <Stack spacing={1}>
              <Rating
                size="medium"
                name="half-rating"
                precision={0.5}
                defaultValue={5}
                value={ratingValue}
                onChange={(e) => setRatingValue(Number(e.target.value))}
              />
            </Stack>
          </div> */}
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={commentText.trim() === ""}
            sx={{
              marginTop: "10px",
              bgcolor: "black",
              color: "white",
              fontWeight: "600",
              "&:hover": { bgcolor: "gray.700" },
              "&.Mui-disabled": {
                bgcolor: "gray.400",
                color: "#fff",
                opacity: 0.7,
              },
            }}
          >
            Đánh giá
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Comment;
