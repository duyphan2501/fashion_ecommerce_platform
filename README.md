# Hướng dẫn triển khai và sử dụng project

# Thành viên

* 52300016 - Đỗ Trần Minh Đức
* 52300020 - Phan Nhựt Duy
* 52300041 - Trần Thanh Liêm

---

# Yêu cầu môi trường

* Cài đặt Docker và Docker Compose trên máy.
* Đảm bảo terminal/command line có thể truy cập các lệnh Docker.

---

# Triển khai project

## 1. Điều hướng tới thư mục

Mở terminal và điều hướng tới thư mục `src` nơi chứa file `docker-compose.yml`.

---

## 2. Khởi tạo container

Chạy Docker Compose để khởi tạo container:

```bash
docker compose up -d
```

---

## 3. Kiểm tra trạng thái container

```bash
docker ps
```

---

## 4. Kiểm tra log MongoDB

```bash
docker compose logs -f mongo-init
```

---

## 5. Truy cập ứng dụng

**-Trang client:** http://localhost:5173  
**-Trang admin:** http://localhost:5174


---

## 6. Dữ liệu test

**- Email:** duyneon09@gmail.com  
**- Password:** Mega123@@

---

## 6. Tài liệu tham khảo

**- Github Repository:** https://github.com/duyphan2501/fashion_ecommerce_platform.git  
 **- Link video demo:** https://drive.google.com/drive/folders/1xrODNYbVTAn5-tXm-b9_TBR7x8TyX42H?usp=sharing

