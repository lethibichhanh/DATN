import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useNavigation } from "@react-navigation/native";

// ✅ Kiểu dữ liệu cho hóa đơn
type HoaDonType = {
  id: string;
  ngayBan: { seconds: number };
  tongTien: number;
  nhanVien?: string;
  khachHang?: string;
  items: {
    tenThuoc: string;
    soLuong: number;
    donGia: number;
  }[];
};

export default function HoaDonScreen() {
  const [hoaDons, setHoaDons] = useState<HoaDonType[]>([]);
  const [searchText, setSearchText] = useState("");
  const [sortType, setSortType] = useState<"date" | "amount">("date");
  const navigation = useNavigation<any>();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "hoadons"), (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        // 🚀 bỏ id từ raw, chỉ lấy doc.id
        const raw = doc.data() as Omit<HoaDonType, "id">;

        // ✅ nếu Firestore chưa lưu tongTien thì tính lại
        const tongTienTinh =
          raw.items?.reduce((sum, it) => sum + it.soLuong * it.donGia, 0) || 0;

        return {
          id: doc.id,
          ...raw,
          tongTien: raw.tongTien ?? tongTienTinh,
        };
      });

      // ✅ Sắp xếp theo ngày mới nhất
      setHoaDons(data.sort((a, b) => b.ngayBan.seconds - a.ngayBan.seconds));
    });

    return () => unsubscribe();
  }, []);

  // ✅ Lọc & tìm kiếm
  const getFilteredData = () => {
    let filtered = hoaDons.filter(
      (hd) =>
        hd.id.toLowerCase().includes(searchText.toLowerCase()) ||
        (hd.khachHang || "").toLowerCase().includes(searchText.toLowerCase())
    );

    if (sortType === "amount") {
      return filtered.sort((a, b) => b.tongTien - a.tongTien);
    } else {
      return filtered.sort((a, b) => b.ngayBan.seconds - a.ngayBan.seconds);
    }
  };

  // ✅ Hiển thị từng hóa đơn
  const renderItem = ({ item }: { item: HoaDonType }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("ChiTietHoaDon", { data: item })}
    >
      <Text style={styles.id}>🆔 Mã HĐ: {item.id}</Text>
      <Text style={styles.date}>
        🕒 {new Date(item.ngayBan.seconds * 1000).toLocaleString()}
      </Text>
      <Text style={styles.amount}>
        💰 Tổng tiền: {item.tongTien.toLocaleString()} VNĐ
      </Text>
      <Text style={styles.items}>🧪 SL mặt hàng: {item.items.length}</Text>
      <Text style={styles.staff}>👨‍⚕️ Nhân viên: {item.nhanVien || "N/A"}</Text>
      <Text style={styles.customer}>
        🙍‍♂️ Khách hàng: {item.khachHang || "Khách lẻ"}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧾 Danh sách Hóa đơn</Text>

      {/* 🔍 Ô tìm kiếm */}
      <TextInput
        placeholder="🔍 Tìm theo mã HĐ hoặc khách hàng..."
        value={searchText}
        onChangeText={setSearchText}
        style={styles.searchInput}
      />

      {/* 🔽 Bộ lọc */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            sortType === "date" && { backgroundColor: "#4a90e2" },
          ]}
          onPress={() => setSortType("date")}
        >
          <Text style={styles.filterText}>📅 Theo ngày</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            sortType === "amount" && { backgroundColor: "#4a90e2" },
          ]}
          onPress={() => setSortType("amount")}
        >
          <Text style={styles.filterText}>💵 Theo tiền</Text>
        </TouchableOpacity>
      </View>

      {/* 📋 Danh sách hóa đơn */}
      <FlatList
        data={getFilteredData()}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.empty}>⚠️ Chưa có hóa đơn</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  filterBtn: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#ddd",
  },
  filterText: { color: "#fff", fontWeight: "bold" },
  card: {
    backgroundColor: "#f0f4f8",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  id: { fontSize: 14, fontWeight: "bold" },
  date: { fontSize: 14, color: "#555" },
  amount: { fontSize: 16, fontWeight: "bold", marginTop: 6 },
  items: { fontSize: 14, marginTop: 4 },
  staff: { fontSize: 14, marginTop: 4, color: "#007AFF" },
  customer: { fontSize: 14, marginTop: 4, color: "#FF5722" },
  empty: {
    textAlign: "center",
    color: "#999",
    fontStyle: "italic",
    marginTop: 20,
  },
});
