# 🏠 Quản Lý Gia Đình - Tổ Ấm Số (`quan-ly-gia-dinh`)

Ứng dụng quản lý gia đình toàn diện với giao diện **Hiện đại, Nổi khối 3D (Tactile Neubrutalism-Lite), Tương phản cao**, hoạt động đồng bộ trên **Web (Vercel)** và **Android (APK)**, kết nối cơ sở dữ liệu **Neon Serverless PostgreSQL**.

---

## ✨ 5 Phân hệ Chức năng Chính

1. **Quản lý Khoản đóng Định kỳ (Tuần / Tháng / Năm) & Khoản Thu (Tháng / Năm)**:
   - Theo dõi các khoản đóng định kỳ theo Tuần (`weekly`), Tháng (`monthly`), Năm (`yearly`).
   - Đánh dấu **Đã đóng / Chưa đóng** 1 chạm theo từng kỳ, lưu rõ **Thành viên nào đã đóng** và xem **Lịch sử thanh toán các kỳ**.
   - Quản lý các khoản thu theo Tháng / Năm và thống kê tổng hợp Thu - Chi.
2. **Thời khóa biểu, Lịch học thêm & Lịch đưa đón Trẻ con**:
   - Quản lý lịch học chính khóa, học thêm, ngoại khóa của từng bé từ Thứ 2 đến Chủ Nhật.
   - Phân công rõ **🚗 Người đưa đi** và **🛵 Người đón về**, kèm địa điểm học và SĐT giáo viên.
   - Banner nhắc nhanh **"Lịch đưa đón con hôm nay"** ngay đầu trang chủ.
3. **Lịch Giỗ & Sự kiện Gia đình (Theo Lịch Âm / Dương)**:
   - Tích hợp thuật toán **Âm lịch - Dương lịch Việt Nam (Hồ Ngọc Đức)**.
   - Tự động quy đổi ngày **Giỗ / Sự kiện Âm lịch** sang **ngày Dương lịch tương ứng của năm hiện tại/tiếp theo** và hiển thị huy hiệu **Đếm ngược số ngày còn lại**.
4. **Kho Tài khoản Dùng chung & Hồ sơ Giấy tờ Cá nhân**:
   - **Kho Tài khoản**: Lưu trữ Username/Password các tài khoản lớp học, cuộc thi của con (*Violympic, IOE, Trạng Nguyên, eNetViet, Zoom...*) và tiện ích gia đình (*Wifi, Điện EVN*) kèm nút **Sao chép nhanh 1 chạm**.
   - **Hồ sơ Giấy tờ Cá nhân**: Lưu trữ *Giấy khai sinh, Thẻ BHYT, CCCD gắn chip, Hộ chiếu* của từng thành viên kèm **Ảnh chụp mặt trước / mặt sau** (tự động nén thông minh lưu trực tiếp vào DB).
5. **Đăng nhập / Tạo mới Thành viên Gia đình**:
   - Tạo tài khoản riêng cho từng thành viên (*Bố, Mẹ, Con, Ông, Bà*) với màu đại diện tương phản cao.

---

## 🚀 Hướng dẫn Deploy lên Vercel & Kết nối Neon.com

1. **Tạo Database trên [Neon.com](https://neon.tech)**:
   - Đăng nhập vào `neon.com` -> Tạo Project mới -> Sao chép chuỗi kết nối `DATABASE_URL` (dạng `postgresql://neondb_owner:...@ep-...neon.tech/neondb?sslmode=require`).
2. **Deploy lên [Vercel.com](https://vercel.com)**:
   - Đẩy thư mục `quan-ly-gia-dinh` lên GitHub và Import vào Vercel (hoặc dùng lệnh `npx vercel`).
   - Trong mục **Environment Variables** trên Vercel, thêm:
     - `DATABASE_URL`: Chuỗi kết nối Neon PostgreSQL của bạn.
     - `JWT_SECRET`: Chuỗi bí mật bất kỳ (ví dụ: `gia-dinh-hanh-phuc-2026`).
   - Ngay lần truy cập đầu tiên, hệ thống sẽ **tự động khởi tạo đủ 8 bảng dữ liệu trên Neon PostgreSQL** (hoặc bạn có thể chạy `npm run db:push` từ máy tính).

---

## 📱 Hướng dẫn Cài đặt & Build File Android APK

- **File APK dựng sẵn**: Nằm tại `quan-ly-gia-dinh.apk` (hoặc `android/app/build/outputs/apk/debug/app-debug.apk`).
- Khi mở ứng dụng trên điện thoại Android, bạn có thể bấm nút **"🌐 Kết nối Vercel"** ở góc phải trên cùng và nhập địa chỉ web Vercel của gia đình để đồng bộ trực tiếp với cơ sở dữ liệu Neon.
- Để tự build lại file APK từ mã nguồn:
  ```bash
  npx cap sync android
  cd android
  ./gradlew assembleDebug
  ```
