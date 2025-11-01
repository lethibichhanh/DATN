import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseConfig";

const features = [
  { title: "Quản lý Nhân viên", icon: "people-outline", screen: "NhanVien" },
  // ✅ TÍNH NĂNG MỚI: Quản lý Khách hàng (Cần thiết cho đồ án CRM)
  { title: "Quản lý Khách hàng", icon: "people-circle-outline", screen: "KhachHang" },
  
  { title: "Quản lý Hóa đơn", icon: "receipt-outline", screen: "HoaDon" },
  { title: "Quản lý Nhập kho", icon: "download-outline", screen: "NhapKho" },
  { title: "Quản lý Thống kê", icon: "bar-chart-outline", screen: "ThongKe" },
  { title: "Quản lý Kiểm kho", icon: "search-circle-outline", screen: "KiemKho" },
  
  // Quản lý thuốc
  { title: "Quản lý Thuốc", icon: "medkit-outline", screen: "DanhSachThuoc" },
  { title: "Thêm thuốc", icon: "add-circle-outline", screen: "ThemThuoc" },
  
  // Quản lý dữ liệu tham chiếu
  { title: "Quản lý Xuất xứ", icon: "globe-outline", screen: "XuatXu" },
  { title: "Quản lý Đơn vị tính", icon: "grid-outline", screen: "DonViTinh" },
  { title: "Quản lý Danh mục", icon: "folder-outline", screen: "DanhMuc" },

  // Tính năng Quản lý tồn kho
  { title: "Quản lý Tồn kho", icon: "cube-outline", screen: "QuanLyTonKho" },
];

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [doanhThu, setDoanhThu] = useState(0);
  const [muaHang, setMuaHang] = useState(0);

  useEffect(() => {
    const now = new Date();
    // Logic tính toán thống kê theo tháng
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // 📊 Doanh thu từ "hoadons" (Real-time)
    const unsub1 = onSnapshot(collection(db, "hoadons"), (snapshot) => {
      let total = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Xử lý trường ngày (ngayBan có thể là Timestamp hoặc String)
        const ngay = data.ngayBan?.toDate?.() || (data.ngayBan ? new Date(data.ngayBan.seconds * 1000) : new Date());
        
        if (ngay >= startOfMonth && ngay <= endOfMonth) {
          total += data.tongTien || 0;
        }
      });
      setDoanhThu(total);
    });

    // 📦 Mua hàng từ "phieunhap" (Real-time)
    const unsub2 = onSnapshot(collection(db, "phieunhap"), (snapshot) => {
      let total = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Xử lý trường ngày (ngayNhap có thể là Timestamp hoặc String)
        const ngay = data.ngayNhap?.toDate?.() || (data.ngayNhap ? new Date(data.ngayNhap.seconds * 1000) : new Date());
        
        if (ngay >= startOfMonth && ngay <= endOfMonth) {
          total += data.tongTien || 0;
        }
      });
      setMuaHang(total);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  const loiNhuan = doanhThu - muaHang;

  const stats = [
    { label: "Doanh thu (tháng này)", value: `${doanhThu.toLocaleString()} VNĐ`, color: "#d1f5d3" },
    { label: "Mua hàng", value: `${muaHang.toLocaleString()} VNĐ`, color: "#ffe0b2" },
    { label: "Lợi nhuận", value: `${loiNhuan.toLocaleString()} VNĐ`, color: "#b3e5fc" },
  ];

  const renderStat = ({ item }: any) => (
    <View style={[styles.statBox, { backgroundColor: item.color }]}>
      <Text style={styles.statValue}>{item.value}</Text>
      <Text>{item.label}</Text>
    </View>
  );

  const renderFeature = ({ item }: any) => (
    <TouchableOpacity
      style={styles.featureCard}
      onPress={() => navigation.navigate(item.screen)}
    >
      <Ionicons name={item.icon} size={28} color="#4a90e2" />
      <Text style={styles.featureText}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.roleText}>Quản trị viên / Chủ tiệm thuốc</Text>

      {/* 📊 Thống kê */}
      <FlatList
        data={stats}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.label}
        renderItem={renderStat}
        contentContainerStyle={styles.statsContainer}
      />

      <Text style={styles.sectionTitle}>Danh sách chức năng</Text>

      <FlatList
        data={features}
        numColumns={3}
        keyExtractor={(item) => item.title}
        renderItem={renderFeature}
        contentContainerStyle={styles.gridContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  roleText: { fontSize: 14, color: "#666", marginBottom: 12 },
  statsContainer: { marginBottom: 20 },
  statBox: {
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 120,
    alignItems: "center",
  },
  statValue: { fontSize: 16, fontWeight: "bold" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  gridContainer: {
    gap: 10,
  },
  featureCard: {
    flex: 1,
    margin: 6,
    padding: 14,
    backgroundColor: "#f0f4f8",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: "31%",
    minHeight: 100,
  },
  featureText: {
    marginTop: 8,
    fontSize: 12,
    textAlign: "center",
  },
});