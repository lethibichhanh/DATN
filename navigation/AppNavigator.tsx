import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { ComponentProps } from "react";
import React from "react";

// ==========================
// 📦 Import các màn hình chính
// ==========================
import BanHangScreen from "../app/screens/Banhang";
import ChiTietHoaDonScreen from "../app/screens/ChiTietHoaDon";
import ChiTietThuoc from "../app/screens/ChiTietThuoc";
import DangKyNhanVien from "../app/screens/DangKyNhanVien";
import DanhMucScreen from "../app/screens/DanhMuc";
import DanhSachThuocScreen from "../app/screens/DanhSachThuoc";
import DonViTinhScreen from "../app/screens/DonViTinh";
import HoaDonScreen from "../app/screens/HoaDon";
import HomeScreen from "../app/screens/HomeScreen";
import KiemKhoScreen from "../app/screens/KiemKho";
import LichSuNhapKhoScreen from "../app/screens/LichSuNhapKho";
import NhapKhoScreen from "../app/screens/NhapKho";
import QuanLyNhanVienScreen from "../app/screens/QuanLyNhanVien";
import QuanLyTonKhoScreen from "../app/screens/QuanLyTonKho";
import StaffHomeScreen from "../app/screens/StaffHomeScreen";
import TaiKhoanScreen from "../app/screens/Taikhoan";
import ThemHoaDonScreen from "../app/screens/ThemHoaDon";
import ThemThuocScreen from "../app/screens/ThemThuoc";
import ThongKeScreen from "../app/screens/ThongKe";
import ThuocTheoDanhMucScreen from "../app/screens/ThuocTheoDanhMuc";
import XuatXuScreen from "../app/screens/XuatXu";
import KhachHangScreen from "../app/screens/KhachHangScreen";
// ✅ THÊM IMPORT MÀN HÌNH CHI TIẾT KHÁCH HÀNG
import ChiTietKhachHangScreen from "../app/screens/ChiTietKhachHangScreen"; 


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
const AdminStack = createNativeStackNavigator<RootStackParamList>();
const StaffStack = createNativeStackNavigator<RootStackParamList>();

// =======================================================
// 🧭 Stack cho ADMIN (tất cả màn hình quản trị)
// =======================================================
function AdminStackNavigator() {
  return (
    <AdminStack.Navigator>
      <AdminStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Trang chủ" }}
      />
      
      {/* QUẢN LÝ KHÁCH HÀNG */}
      <AdminStack.Screen
        name="KhachHang"
        component={KhachHangScreen}
        options={{ title: "Quản Lý Khách Hàng" }}
      />
      {/* ✅ FIX LỖI: THÊM ChiTietKhachHang VÀO CÙNG STACK VỚI KhachHangScreen */}
      <AdminStack.Screen
        name="ChiTietKhachHang"
        component={ChiTietKhachHangScreen} 
        options={{ title: "Chi Tiết Khách Hàng" }}
      /> 
      
      {/* THUỐC */}
      <AdminStack.Screen
        name="DanhSachThuoc"
        component={DanhSachThuocScreen}
        options={{ title: "Danh sách thuốc" }}
      />
      <AdminStack.Screen
        name="ChiTietThuoc"
        component={ChiTietThuoc}
        options={{ title: "Chi tiết thuốc" }}
      />
      <AdminStack.Screen
        name="ThemThuoc"
        component={ThemThuocScreen}
        options={{ title: "Thêm / Sửa thuốc" }}
      />
      {/* HÓA ĐƠN */}
      <AdminStack.Screen
        name="HoaDon"
        component={HoaDonScreen}
        options={{ title: "Hóa đơn" }}
      />
      <AdminStack.Screen
        name="ChiTietHoaDon"
        component={ChiTietHoaDonScreen}
        options={{ title: "Chi tiết hóa đơn" }}
      />
      <AdminStack.Screen
        name="ThemHoaDon"
        component={ThemHoaDonScreen}
        options={{ title: "Thêm hóa đơn" }}
      />
      {/* KHÁC */}
      <AdminStack.Screen
        name="ThongKe"
        component={ThongKeScreen}
        options={{ title: "Thống kê" }}
      />
      <AdminStack.Screen
        name="ThuocTheoDanhMuc"
        component={ThuocTheoDanhMucScreen}
        options={{ title: "Thuốc theo danh mục" }}
      />
    </AdminStack.Navigator>
  );
}

// =======================================================
// 💊 Stack cho Kho Thuốc (Admin)
// =======================================================
function KhoThuocStack() {
  return (
    <AdminStack.Navigator>
      <AdminStack.Screen
        name="DanhSachThuoc"
        component={DanhSachThuocScreen}
        options={{ title: "📦 Danh sách thuốc" }}
      />
      <AdminStack.Screen
        name="ChiTietThuoc"
        component={ChiTietThuoc}
        options={{ title: "💊 Chi tiết thuốc" }}
      />
      <AdminStack.Screen
        name="ThemThuoc"
        component={ThemThuocScreen}
        options={{ title: "➕ Thêm / Sửa thuốc" }}
      />
      {/* KHUYẾN NGHỊ: Thêm ChiTietKhachHang nếu có thể truy cập từ đâu đó trong KhoThuocStack */}
      {/* <AdminStack.Screen 
        name="ChiTietKhachHang" 
        component={ChiTietKhachHangScreen} 
        options={{ title: "Chi Tiết Khách Hàng" }} 
      /> */}
    </AdminStack.Navigator>
  );
}

// =======================================================
// 👨‍💼 Stack cho STAFF (nhân viên)
// =======================================================
function StaffStackNavigator() {
  return (
    <StaffStack.Navigator>
      <StaffStack.Screen
        name="StaffHome"
        component={StaffHomeScreen}
        options={{ title: "Trang chủ" }}
      />
      
      {/* QUẢN LÝ KHÁCH HÀNG (Nên cho nhân viên xem/thêm khách hàng) */}
      <StaffStack.Screen
        name="KhachHang"
        component={KhachHangScreen}
        options={{ title: "Quản Lý Khách Hàng" }}
      />
      {/* ✅ KHUYẾN NGHỊ: Thêm ChiTietKhachHang cho Staff */}
      <StaffStack.Screen
        name="ChiTietKhachHang"
        component={ChiTietKhachHangScreen} 
        options={{ title: "Chi Tiết Khách Hàng" }}
      /> 
      
      {/* QUẢN LÝ HÓA ĐƠN & THỐNG KÊ */}
      <StaffStack.Screen
        name="HoaDon"
        component={HoaDonScreen}
        options={{ title: "Hóa đơn" }}
      />
      <StaffStack.Screen
        name="ChiTietHoaDon"
        component={ChiTietHoaDonScreen}
        options={{ title: "Chi tiết hóa đơn" }}
      />
      <StaffStack.Screen
        name="ThongKe" 
        component={ThongKeScreen}
        options={{ title: "Thống kê" }}
      />

      {/* QUẢN LÝ THUỐC & KHO */}
      <StaffStack.Screen
        name="DanhSachThuoc"
        component={DanhSachThuocScreen}
        options={{ title: "Danh sách thuốc" }}
      />
      <StaffStack.Screen
        name="ChiTietThuoc"
        component={ChiTietThuoc}
        options={{ title: "Chi tiết thuốc" }}
      />
      <StaffStack.Screen
        name="ThemThuoc"
        component={ThemThuocScreen}
        options={{ title: "Thêm/Sửa thuốc" }}
      />
      <StaffStack.Screen
        name="NhapKho"
        component={NhapKhoScreen}
        options={{ title: "Quản lý Nhập kho" }}
      />
      <StaffStack.Screen
        name="KiemKho"
        component={KiemKhoScreen}
        options={{ title: "Quản lý Kiểm kho" }}
      />

      {/* QUẢN LÝ DANH MỤC */}
      <StaffStack.Screen
        name="XuatXu"
        component={XuatXuScreen}
        options={{ title: "Quản lý Xuất xứ" }}
      />
      <StaffStack.Screen
        name="DonViTinh"
        component={DonViTinhScreen}
        options={{ title: "Quản lý Đơn vị tính" }}
      />
      <StaffStack.Screen
        name="DanhMuc"
        component={DanhMucScreen}
        options={{ title: "Quản lý Danh mục" }}
      />
    </StaffStack.Navigator>
  );
}

// =======================================================
// 🧭 Tabs cho ADMIN
// =======================================================
function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        // HomeTab chứa AdminStackNavigator, nên màn hình đầu tiên (Home) sẽ hiện header
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
// 🚀 AppNavigator chính
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

        {/* 👥 Quản lý nhân viên */}
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

        {/* 📊 Các phần khác (Đã được Admin/Staff Stack lồng vào) */}
        <Stack.Screen name="DanhMuc" component={DanhMucScreen} />
        <Stack.Screen
          name="ThuocTheoDanhMuc"
          component={ThuocTheoDanhMucScreen}
          options={{ title: "Thuốc theo danh mục" }}
        />
        <Stack.Screen name="DonViTinh" component={DonViTinhScreen} />
        <Stack.Screen name="XuatXu" component={XuatXuScreen} />
        <Stack.Screen name="KiemKho" component={KiemKhoScreen} />
        <Stack.Screen name="NhapKho" component={NhapKhoScreen} />
        <Stack.Screen name="LichSuNhapKho" component={LichSuNhapKhoScreen} />
        <Stack.Screen
          name="QuanLyTonKho"
          component={QuanLyTonKhoScreen}
          options={{ title: "Quản lý tồn kho" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}