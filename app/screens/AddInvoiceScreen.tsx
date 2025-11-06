import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import {
  addDoc,
  updateDoc,
  // 🌟 THÊM CÁC HÀM CẦN THIẾT CHO TRUY VẤN
  getDoc,
  doc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { RootStackParamList } from "../../types";

type ItemType = {
  tenThuoc: string;
  soLuong: number;
  donGia: number;
};

type RouteProps = RouteProp<RootStackParamList, "ThemHoaDon">;

export default function ThemHoaDonScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();

  // Nếu có dữ liệu từ ChiTietHoaDonScreen => Chế độ chỉnh sửa
  const editingData = route.params?.data;

  const [khachHang, setKhachHang] = useState(editingData?.khachHang || "");
  const [nhanVien, setNhanVien] = useState(editingData?.nhanVien || "");
  const [giamGia, setGiamGia] = useState(editingData?.giamGia?.toString() || "0");
  const [thue, setThue] = useState(editingData?.thue?.toString() || "0");
  const [items, setItems] = useState<ItemType[]>(editingData?.items || []);

  const [tenThuoc, setTenThuoc] = useState("");
  const [soLuong, setSoLuong] = useState("");
  const [donGia, setDonGia] = useState("");

  // ✅ Tính tổng tiền hóa đơn
  const tongTienHang = items.reduce((sum, i) => sum + i.soLuong * i.donGia, 0);
  const tongCong = tongTienHang - Number(giamGia || 0) + Number(thue || 0);

  // ✅ Thêm thuốc vào danh sách
  const handleAddItem = () => {
    if (!tenThuoc || !soLuong || !donGia) {
      Alert.alert("⚠️ Lỗi", "Vui lòng nhập đầy đủ thông tin thuốc");
      return;
    }
    setItems([
      ...items,
      { tenThuoc, soLuong: Number(soLuong), donGia: Number(donGia) },
    ]);
    setTenThuoc("");
    setSoLuong("");
    setDonGia("");
  };

  // ✅ Xóa 1 thuốc
  const handleRemoveItem = (index: number) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  // ✅ Lưu hóa đơn + cập nhật tổng chi tiêu khách hàng
  const handleSaveInvoice = async () => {
    try {
      if (!khachHang) {
        Alert.alert("⚠️ Lỗi", "Vui lòng nhập khách hàng trước khi lưu!");
        return;
      }

      if (editingData) {
        // ✅ Cập nhật hóa đơn
        await updateDoc(doc(db, "hoadons", editingData.id), {
          khachHang,
          nhanVien,
          giamGia: Number(giamGia),
          thue: Number(thue),
          tongTien: tongCong,
          items,
        });
        Alert.alert("✅ Thành công", "Cập nhật hóa đơn thành công!");
      } else {
        // --- 1. Thêm hóa đơn mới ---
        await addDoc(collection(db, "hoadons"), {
          khachHang,
          nhanVien,
          giamGia: Number(giamGia),
          thue: Number(thue),
          tongTien: tongCong,
          items,
          ngayBan: serverTimestamp(),
        });

        // --- 2. CẬP NHẬT tongTienMua CỦA KHÁCH HÀNG (CRM) ---
        // 🚨 SỬA LỖI 1: Thay thế doc() bằng query() và where()
        // 🚨 SỬA LỖI 2: Đổi tên collection từ "khachhang" thành "khachhangs"
        const customerQuery = query(
          collection(db, "khachhangs"), // Tên collection chính xác
          where("sdt", "==", khachHang) // Giả định khachHang là SĐT
        );

        const customerSnapshot = await getDocs(customerQuery);

        if (!customerSnapshot.empty) {
          const customerDoc = customerSnapshot.docs[0];
          const currentTotal = customerDoc.data().tongTienMua || 0;
          
          await updateDoc(customerDoc.ref, {
            tongTienMua: currentTotal + tongCong,
          });
          Alert.alert("✅ Thành công", "Thêm hóa đơn & cập nhật khách hàng thành công!");
        } else {
          Alert.alert("⚠️ Cảnh báo", `Không tìm thấy khách hàng với SĐT/ID: ${khachHang} để cập nhật tổng tiền mua.`);
        }
      }

      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert("❌ Lỗi", "Không thể lưu hóa đơn");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {editingData ? "✏️ Chỉnh sửa hóa đơn" : "➕ Thêm hóa đơn"}
      </Text>

      {/* Nhập thông tin chung */}
      <TextInput
        placeholder="👨‍⚕️ Nhân viên"
        value={nhanVien}
        onChangeText={setNhanVien}
        style={styles.input}
      />
      <TextInput
        placeholder="🙍‍♂️ SĐT Khách hàng "
        value={khachHang}
        onChangeText={setKhachHang}
        style={[styles.input, { fontWeight: 'bold', borderColor: '#4a90e2' }]} // Nhấn mạnh đây là SĐT
      />
      <TextInput
        placeholder="💸 Giảm giá (VNĐ)"
        value={giamGia}
        onChangeText={setGiamGia}
        keyboardType="numeric"
        style={styles.input}
      />
      <TextInput
        placeholder="📊 Thuế (VNĐ)"
        value={thue}
        onChangeText={setThue}
        keyboardType="numeric"
        style={styles.input}
      />

      {/* Thêm thuốc */}
      <View style={styles.addItemContainer}>
        <TextInput
          placeholder="Tên thuốc"
          value={tenThuoc}
          onChangeText={setTenThuoc}
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
        />
        <TextInput
          placeholder="SL"
          value={soLuong}
          onChangeText={setSoLuong}
          keyboardType="numeric"
          style={[styles.input, { width: 60, marginBottom: 0 }]}
        />
        <TextInput
          placeholder="Đơn giá"
          value={donGia}
          onChangeText={setDonGia}
          keyboardType="numeric"
          style={[styles.input, { width: 100, marginBottom: 0 }]}
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleAddItem}>
          <Text style={{ color: "#fff" }}>➕</Text>
        </TouchableOpacity>
      </View>

      {/* Danh sách thuốc */}
      <FlatList
        data={items}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => (
          <View style={styles.item}>
            <View>
              <Text style={{ fontWeight: '600' }}>{item.tenThuoc}</Text>
              <Text style={{ fontSize: 13, color: '#666' }}>
                {item.soLuong} x {item.donGia.toLocaleString()} ={" "}
                <Text style={{ fontWeight: 'bold', color: 'darkgreen' }}>
                    {(item.soLuong * item.donGia).toLocaleString()} VNĐ
                </Text>
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleRemoveItem(index)}>
              <Text style={{ color: "red", fontSize: 16 }}>❌</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Tổng cộng */}
      <Text style={styles.total}>✅ Tổng cộng: {tongCong.toLocaleString()} VNĐ</Text>

      {/* Nút lưu */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSaveInvoice}>
        <Text style={{ color: "#fff", fontWeight: "bold" }}>
          {editingData ? "💾 Cập nhật hóa đơn" : "💾 Lưu hóa đơn"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  addItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 6
  },
  addBtn: {
    backgroundColor: "#4a90e2",
    padding: 12,
    borderRadius: 8,
    // margin-left được chuyển thành gap trong addItemContainer
  },
  item: {
    backgroundColor: "#f8f8f8",
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: 'center'
  },
  total: { fontSize: 18, fontWeight: "bold", marginTop: 12, color: "green", textAlign: 'right', paddingRight: 5 },
  saveBtn: {
    backgroundColor: "#4a90e2",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
});