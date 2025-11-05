import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { ComponentProps } from "react";
import React from "react";

// ==========================
// 📦 Import các màn hình chính
// ==========================
import BanHangScreen from "../app/screens/SalesScreen";
import ChiTietHoaDonScreen from "../app/screens/InvoiceDetailScreen";
import ChiTietKhachHangScreen from "../app/screens/CustomerDetailScreen";
import ChiTietThuoc from "../app/screens/MedicineDetailScreen";
import DangKyNhanVien from "../app/screens/EmployeeRegisterScreen";
import DanhMucScreen from "../app/screens/CategoryScreen";
import DanhSachThuocScreen from "../app/screens/MedicineListScreen";
import DonViTinhScreen from "../app/screens/UnitOfMeasureScreen";
import HoaDonScreen from "../app/screens/InvoiceScreen";
import HomeScreen from "../app/screens/HomeScreen";
import KhachHangScreen from "../app/screens/CustomerScreen";
import KiemKhoScreen from "../app/screens/InventoryCheckScreen";
import LichSuNhapKhoScreen from "../app/screens/WarehouseImportHistoryScreen";
import NhapKhoScreen from "../app/screens/ImportWarehouseScreen";
import QuanLyNhanVienScreen from "../app/screens/EmployeeManagementScreen";
import QuanLyTonKhoScreen from "../app/screens/InventoryManagementScreen";
import StaffHomeScreen from "../app/screens/StaffHomeScreen";
import TaiKhoanScreen from "../app/screens/AccountScreen";
import ThemHoaDonScreen from "../app/screens/AddInvoiceScreen";
import ThemThuocScreen from "../app/screens/AddMedicineScreen";
import ThongKeScreen from "../app/screens/StatisticScreen";
import ThuocTheoDanhMucScreen from "../app/screens/MedicineByCategoryScreen";
import XuatXuScreen from "../app/screens/OriginScreen";

// IMPORT CÁC MÀN HÌNH CHẤM CÔNG & LƯƠNG
import BangLuongScreen from "../app/screens/SalaryScreen";
import ChamCongScreen from "../app/screens/AttendanceScreen";
import LichLamViecScreen from "../app/screens/ScheduleScreen";

// ⚙️ IMPORT MÀN HÌNH CÀI ĐẶT MỚI
import SettingsScreen from "../app/screens/SettingsScreen";


// ==========================
// 🔐 Đăng nhập & đăng ký
// ==========================
import LoginScreen from "../app/screens/LoginScreen";
import SignUpScreen from "../app/screens/SignUpScreen";

// ==========================
// 🧩 Types
// ==========================
import type { RootStackParamList } from "../types";

type IoniconsName = ComponentProps<typeof Ionicons>["name"];

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();
// Vẫn giữ khai báo AdminStack/StaffStack để đảm bảo tính nhất quán 
// nhưng chỉ sử dụng chúng bên trong các hàm sau.

// =======================================================
// 🧭 Stack cho ADMIN (CHỈ GIỮ LẠI MÀN HÌNH GỐC)
// =======================================================
function AdminStackNavigator() {
  const AdminInnerStack = createNativeStackNavigator<RootStackParamList>();
  return (
    <AdminInnerStack.Navigator>
      <AdminInnerStack.Screen
        name="Home" // Màn hình gốc của Tab "Trang chủ"
        component={HomeScreen}
        options={{ title: "Trang chủ" }}
      />
      {/* TẤT CẢ CÁC MÀN HÌNH SÂU KHÁC (DanhSachThuoc, HoaDon, KhachHang, ThongKe...)
        ĐÃ ĐƯỢC CHUYỂN LÊN ROOT STACK (AppNavigator)
      */}
    </AdminInnerStack.Navigator>
  );
}

// =======================================================
// 💊 Stack cho Kho Thuốc (CHỈ GIỮ LẠI MÀN HÌNH GỐC)
// * Đổi tên màn hình gốc thành "KhoThuocRoot" để tránh trùng lặp 
//   với màn hình "DanhSachThuoc" đã được định nghĩa trong Root Stack.
// =======================================================
function KhoThuocStack() {
  const KhoThuocInnerStack = createNativeStackNavigator<RootStackParamList>();
  return (
    <KhoThuocInnerStack.Navigator>
      <KhoThuocInnerStack.Screen
        name={"DanhSachThuoc" as keyof RootStackParamList} // Giữ nguyên tên component nếu nó là màn hình Tab Root.
        component={DanhSachThuocScreen}
        options={{ title: "📦 Danh sách thuốc" }}
      />
      {/* TẤT CẢ CÁC MÀN HÌNH SÂU KHÁC (ChiTietThuoc, ThemThuoc...)
        ĐÃ ĐƯỢC CHUYỂN LÊN ROOT STACK
      */}
    </KhoThuocInnerStack.Navigator>
  );
}

// =======================================================
// 👨‍💼 Stack cho STAFF (CHỈ GIỮ LẠI MÀN HÌNH GỐC)
// =======================================================
function StaffStackNavigator() {
  const StaffInnerStack = createNativeStackNavigator<RootStackParamList>();
  return (
    <StaffInnerStack.Navigator>
      <StaffInnerStack.Screen
        name="StaffHome" // Màn hình gốc của Tab "Trang chủ" (Staff)
        component={StaffHomeScreen}
        options={{ title: "Trang chủ" }}
      />
      {/* TẤT CẢ CÁC MÀN HÌNH SÂU KHÁC (KhachHang, HoaDon, DanhSachThuoc...)
        ĐÃ ĐƯỢC CHUYỂN LÊN ROOT STACK
      */}
    </StaffInnerStack.Navigator>
  );
}

// =======================================================
// 🧭 Tabs cho ADMIN
// =======================================================
function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, 
        tabBarActiveTintColor: "#007bff",
        tabBarInactiveTintColor: "#777",
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={AdminStackNavigator}
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="KhoThuocTab"
        component={KhoThuocStack}
        options={{
          title: "Kho thuốc",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Sales"
        component={BanHangScreen}
        options={{
          title: "Bán hàng",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={TaiKhoanScreen}
        options={{
          title: "Tài khoản",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// =======================================================
// 🧭 Tabs cho STAFF
// =======================================================
function StaffTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#007bff",
        tabBarInactiveTintColor: "#777",
      }}
    >
      <Tab.Screen
        name="StaffHomeTab"
        component={StaffStackNavigator}
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Sales"
        component={BanHangScreen}
        options={{
          title: "Bán thuốc",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={TaiKhoanScreen}
        options={{
          title: "Tài khoản",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// =======================================================
// 🚀 AppNavigator chính (ROOT STACK) - NƠI DUY NHẤT ĐỊNH NGHĨA CÁC MÀN HÌNH SÂU
// =======================================================
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: true }}>
        {/* 🔐 Đăng nhập & Đăng ký */}
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SignUp"
          component={SignUpScreen}
          options={{ title: "Đăng ký tài khoản" }}
        />

        {/* 🧭 Tabs chính */}
        <Stack.Screen
          name="AdminTabs"
          component={AdminTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="StaffTabs"
          component={StaffTabs}
          options={{ headerShown: false }}
        />
        
        {/* ⚙️ THÊM MÀN HÌNH SETTINGS VÀO ROOT STACK ĐỂ CÓ THỂ GỌI TỪ Profile/TaiKhoanScreen */}
        <Stack.Screen
          name="SettingsScreen" // Tên cần phải khớp với navigation.navigate('SettingsScreen')
          component={SettingsScreen}
          options={{ title: "Cài Đặt Ứng Dụng" }}
        />

        {/* MÀN HÌNH CHUNG / DEEP LINKS (Chỉ định nghĩa 1 lần tại đây)
        */}
        
        {/* Lương, Chấm công, Lịch làm việc */}
        <Stack.Screen
          name="ChamCong"
          component={ChamCongScreen}
          options={{ title: "Chấm công nhân viên" }}
        />
        <Stack.Screen
          name="LichLamViec"
          component={LichLamViecScreen}
          options={{ title: "Lịch làm việc nhân viên" }}
        />
        <Stack.Screen
          name="BangLuong"
          component={BangLuongScreen}
          options={{ title: "Bảng lương nhân viên" }}
        />
        
        {/* Quản lý Nhân viên */}
        <Stack.Screen
          name="NhanVien"
          component={QuanLyNhanVienScreen}
          options={{ title: "Quản lý nhân viên" }}
        />
        <Stack.Screen
          name="DangKyNhanVien"
          component={DangKyNhanVien}
          options={{ title: "Đăng ký nhân viên" }}
        />

        {/* Quản lý Khách hàng */}
        <Stack.Screen
          name="KhachHang"
          component={KhachHangScreen}
          options={{ title: "Quản Lý Khách Hàng" }}
        />
        <Stack.Screen
          name="ChiTietKhachHang"
          component={ChiTietKhachHangScreen}
          options={{ title: "Chi Tiết Khách Hàng" }}
        />

        {/* Quản lý Thuốc */}
        <Stack.Screen
          name="DanhSachThuoc"
          component={DanhSachThuocScreen}
          options={{ title: "Danh sách thuốc" }}
        />
        <Stack.Screen
          name="ChiTietThuoc"
          component={ChiTietThuoc}
          options={{ title: "Chi tiết thuốc" }}
        />
        <Stack.Screen
          name="ThemThuoc"
          component={ThemThuocScreen}
          options={{ title: "Thêm / Sửa thuốc" }}
        />
        
        {/* Quản lý Hóa đơn */}
        <Stack.Screen
          name="HoaDon"
          component={HoaDonScreen}
          options={{ title: "Hóa đơn" }}
        />
        <Stack.Screen
          name="ChiTietHoaDon"
          component={ChiTietHoaDonScreen}
          options={{ title: "Chi tiết hóa đơn" }}
        />
        <Stack.Screen
          name="ThemHoaDon"
          component={ThemHoaDonScreen}
          options={{ title: "Thêm hóa đơn" }}
        />
        
        {/* Các màn hình chung khác */}
        <Stack.Screen name="DanhMuc" component={DanhMucScreen} options={{ title: "Quản lý Danh mục" }} />
        <Stack.Screen name="DonViTinh" component={DonViTinhScreen} options={{ title: "Quản lý Đơn vị tính" }} />
        <Stack.Screen name="XuatXu" component={XuatXuScreen} options={{ title: "Quản lý Xuất xứ" }} />
        <Stack.Screen name="KiemKho" component={KiemKhoScreen} options={{ title: "Quản lý Kiểm kho" }} />
        <Stack.Screen name="NhapKho" component={NhapKhoScreen} options={{ title: "Quản lý Nhập kho" }} />
        <Stack.Screen name="LichSuNhapKho" component={LichSuNhapKhoScreen} options={{ title: "Lịch sử nhập kho" }} />
        <Stack.Screen name="QuanLyTonKho" component={QuanLyTonKhoScreen} options={{ title: "Quản lý tồn kho" }} />
        <Stack.Screen name="ThongKe" component={ThongKeScreen} options={{ title: "Thống kê" }} />
        <Stack.Screen
          name="ThuocTheoDanhMuc"
          component={ThuocTheoDanhMucScreen}
          options={{ title: "Thuốc theo danh mục" }}
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}