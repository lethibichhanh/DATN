// =======================================================
// 💊 PHARMAPROJECT - TYPESCRIPT DEFINITIONS
// =======================================================
import { Timestamp } from "firebase/firestore";

// Định nghĩa lại kiểu Timestamp của Firestore để sử dụng nhất quán
// Vì `any` không tốt, dùng kiểu `Timestamp` của firebase/firestore
// Nếu không muốn import từ firebase, bạn có thể dùng một interface đơn giản:
// interface FirestoreTimestamp { seconds: number; nanoseconds: number; }

// ===============================
// 🔹 Định nghĩa kiểu dữ liệu Khách hàng
// ===============================
export type KhachHang = {
    id: string;
    ten: string; // Tên khách hàng (BẮT BUỘC)
    sdt: string; // Số điện thoại (Key chính, BẮT BUỘC)
    diaChi: string; // Địa chỉ
    email: string;
    ngaySinh: string; // Định dạng 'dd/MM/yyyy'
    tongTienMua: number; // Tổng tiền đã mua (quan trọng cho CRM)
    ngayTao: Timestamp; // Sử dụng kiểu Timestamp
};

// ===============================
// 🔹 Định nghĩa kiểu dữ liệu Thuốc
// ===============================
export type Thuoc = {
    id: string;
    ten: string;
    soluong: number;
    hanSuDung: string; // Định dạng 'dd/MM/yyyy' hoặc ISO 8601
    giaBan: number; // ✅ Giá bán thuốc (Bắt buộc phải có trong cấu trúc)
    donViTinh: string;
    xuatXu: string;
    danhMuc: string;
    ghiChu: string;
    imageUrl: string; // ✅ Ảnh thuốc (URL)
    qrValue: string; // ✅ Mã QR tự sinh
    ngayTao: Timestamp; // ✅ Ngày tạo Firestore
};

// ===============================
// 🔹 Kiểu dữ liệu từng sản phẩm trong hóa đơn
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
    ngayBan: Timestamp; // Sử dụng kiểu Timestamp
    tongTien: number;
    nhanVien: string; // uid của nhân viên
    khachHang: string; // id của khách hàng
    giamGia: number;
    thue: number;
    items: HoaDonItem[];
};

// ===============================
// 🔹 Định nghĩa kiểu dữ liệu Ca làm việc (Shift Template)
// Lưu ý: Đây là template cố định 7 ngày, không có ngày tháng cụ thể
// ===============================
export type Shift = {
    day: string; // Tên ngày (ví dụ: Thứ Hai, Thứ Ba)
    start: string; // Giờ bắt đầu (HH:mm)
    end: string; // Giờ kết thúc (HH:mm)
};


// ===============================
// 🔹 Định nghĩa kiểu dữ liệu User (nhân viên)
// ===============================
export type User = {
    uid: string;
    email: string;
    name: string;
    role: "admin" | "staff";

    // 🔹 Các trường HR & Cấu hình
    salary: number; // Lương cơ bản
    allowance: number; // Phụ cấp
    shiftSchedule: Shift[]; // Ca làm việc MẪU (Template)
    createdAt: Timestamp;
};

// ===============================
// 🔹 Định nghĩa kiểu dữ liệu cho nhật ký nhập thuốc
// ===============================
export type NhatKyNhap = {
    id: string;
    thuocId: string; // ID thuốc liên quan
    tenThuoc: string;
    soLuongNhap: number;
    ngayNhap: Timestamp; // Firestore Timestamp
    nhanVien: string; // uid nhân viên nhập
    ghiChu: string;
};

// ===============================
// 🔹 Định nghĩa kiểu dữ liệu Chấm công (attendance)
// *Lưu ý: Thêm trường `shift` để biết ca nào đang chấm công*
// ===============================
export type Attendance = {
    id: string;
    uid: string; // ID nhân viên
    date: string; // Ngày chấm công: YYYY-MM-DD
    checkIn: string | null; // HH:mm:ss hoặc null
    checkOut: string | null; // HH:mm:ss hoặc null
    shift: string; // Ca làm việc đã đăng ký (ví dụ: '08:00-17:00')
};

// =======================================================
// 🔹 ROOTSTACKPARAMLIST - Danh sách tất cả màn hình
// =======================================================
export type RootStackParamList = {
    // ⚙️ Cấu hình chung
    SettingsScreen: undefined;

    // 🧭 Đăng nhập & đăng ký
    Login: undefined;
    SignUp: undefined;
    AdminTabs: undefined; // Điều hướng đến Tab Navigator của Admin
    StaffTabs: undefined; // Điều hướng đến Tab Navigator của Staff

    // 📱 Tabs con (Thường không dùng trực tiếp trong Stack Nav nếu đã dùng Tabs Nav)
    // Tốt hơn nên loại bỏ, nhưng giữ lại nếu dùng như route độc lập.
    Main: undefined;
    Profile: undefined;
    HomeTab: undefined;
    KhoThuocTab: undefined;
    Sales: undefined;
    StaffHomeTab: undefined;

    // 🏠 Trang chủ (Nên dùng tên phân biệt nếu HomeTab đã tồn tại)
    Home: undefined; 
    StaffHome: undefined; 

    // ⚕️ Thuốc
    ThemThuoc: { id?: string } | undefined; // Thêm mới hoặc chỉnh sửa
    DanhSachThuoc: undefined;
    ChiTietThuoc: { thuoc: Thuoc };

    // 🧾 Hóa đơn
    HoaDon: undefined;
    ChiTietHoaDon: { data: HoaDon };
    ThemHoaDon: { data?: HoaDon } | undefined; // Thêm mới hoặc chỉnh sửa

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

    // 👥 Quản lý người dùng & khách hàng
    NhanVien: undefined;
    DangKyNhanVien: { editUser?: User }; // Đăng ký mới hoặc chỉnh sửa

    // Khách hàng
    KhachHang: undefined;
    ChiTietKhachHang: { customerId: string };
    ThemKhachHang: { khachHang?: KhachHang } | undefined; // Thêm màn hình quản lý Khách hàng

    // 📦 Nhật ký nhập thuốc
    NhatKyNhapThuoc: { thuocId: string };

    // 🔹 HR (Nhân sự)
    ChamCong: { user: User }; // Chấm công cho 1 nhân viên
    BangLuong: { user: User }; // Bảng lương cho 1 nhân viên
    LichLamViec: { user: User }; // Lịch đã áp dụng/hiển thị
    SetupLichLamViec: { user: User }; // ✅ Lịch MẪU (Template)

    // ⭐ THÊM CÁC MÀN HÌNH THIẾU LOGIC
    TaoHoaDonMoi: undefined; // Màn hình bắt đầu tạo hóa đơn
    ThongTinNhanVien: { user: User }; // Chi tiết nhân viên
};