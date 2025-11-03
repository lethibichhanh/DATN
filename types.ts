// ===============================
// 🔹 Định nghĩa kiểu dữ liệu Khách hàng
// ===============================
// Đã thêm: Kiểu KhachHang để định nghĩa dữ liệu cho màn hình CRM
export type KhachHang = {
  id: string;
  ten: string; // Tên khách hàng (BẮT BUỘC)
  sdt: string; // Số điện thoại (Key chính, BẮT BUỘC)
  diaChi: string; // Địa chỉ
  email: string;
  ngaySinh: string; // Định dạng 'dd/MM/yyyy'
  tongTienMua: number; // Tổng tiền đã mua (Dữ liệu quan trọng cho đồ án CRM)
  ngayTao: any; // Timestamp Firestore
};

// ===============================
// 🔹 Định nghĩa kiểu dữ liệu Thuốc
// ===============================
export type Thuoc = {
  id: string;
  ten: string;
  soluong: number;
  hanSuDung: string;
  giaBan?: number; 		// ✅ Giá bán thuốc
  donViTinh?: string;
  xuatXu?: string;
  danhMuc?: string;
  ghiChu?: string;
  imageUrl?: string; 		// ✅ Ảnh thuốc (URL)
  qrValue?: string; 		// ✅ Mã QR sinh tự động
  ngayTao?: any; 		// ✅ Ngày tạo Firestore (Timestamp)
};

// ===============================
// 🔹 Kiểu dữ liệu cho từng sản phẩm trong hóa đơn
// ===============================
export type HoaDonItem = {
  tenThuoc: string;
  soLuong: number;
  donGia: number;
};

// ===============================
// 🔹 Định nghĩa kiểu dữ liệu Hóa đơn
// ===============================
export type HoaDon = {
  id: string;
  ngayBan: { seconds: number }; // Firestore timestamp
  tongTien: number;
  nhanVien?: string;
  khachHang?: string;
  giamGia?: number;
  thue?: number;
  items: HoaDonItem[];
};

// ===============================
// 🔹 Định nghĩa kiểu dữ liệu User (nhân viên)
// ===============================
export type User = {
  uid: string;
  email: string;
  name: string;
  role: "admin" | "staff";
};

// ===============================
// 🔹 Định nghĩa kiểu dữ liệu cho nhật ký nhập thuốc
// ===============================
export type NhatKyNhap = {
  id: string;
  thuocId: string; 		// ID thuốc liên quan
  tenThuoc: string;
  soLuongNhap: number;
  ngayNhap: any; 		// Firestore Timestamp
  nhanVien?: string;
  ghiChu?: string;
};

// ===============================
// 🔹 RootStackParamList (TẤT CẢ MÀN HÌNH TRONG ỨNG DỤNG)
// ===============================
export type RootStackParamList = {
  // 🧭 Đăng nhập & đăng ký
  Login: undefined;
  SignUp: undefined;
  AdminTabs: undefined;
  StaffTabs: undefined;

  // 📱 Tabs con (cần đảm bảo các tên tab đã dùng trong AppNavigator)
  Main: undefined;
  Profile: undefined;
  HomeTab: undefined;
  KhoThuocTab: undefined;
  Sales: undefined;
  StaffHomeTab: undefined;


  // 🏠 Trang chủ
  Home: undefined; 		// ✅ Trang chủ admin
  StaffHome: undefined; 	// ✅ Trang chủ nhân viên

  // ⚕️ Thuốc
  ThemThuoc: { id?: string } | undefined;
  DanhSachThuoc: undefined;
  ChiTietThuoc: { thuoc: Thuoc };

  // 🧾 Hóa đơn
  HoaDon: undefined;
  ChiTietHoaDon: { data: HoaDon };
  ThemHoaDon: { data?: HoaDon } | undefined;

  // 📂 Danh mục, đơn vị, xuất xứ
  DanhMuc: undefined;
  ThuocTheoDanhMuc: { danhMuc: string };
  DonViTinh: undefined;
  XuatXu: undefined;

  // 📦 Kho & nhập xuất
  Inventory: undefined;
  NhapKho: undefined;
  LichSuNhapKho: undefined;

  // ✅ Quản lý tồn kho
  QuanLyTonKho: undefined;

  // 📊 Thống kê & kiểm kho
  ThongKe: undefined;
  KiemKho: undefined;

  // 👥 Quản lý người dùng & Khách hàng
  NhanVien: undefined;
  DangKyNhanVien: { editUser?: User };
  
  // ✅ FIX: THÊM MÀN HÌNH KHÁCH HÀNG
  KhachHang: undefined; 
  ChiTietKhachHang: { customerId: string }; 
  
  // 🧾 Nhật ký nhập thuốc (📦 mới thêm)
  NhatKyNhapThuoc: { thuocId: string };
};