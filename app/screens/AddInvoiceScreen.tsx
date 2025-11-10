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

// 🔥 CẬP NHẬT: Thêm trường giaVon vào ItemType
type ItemType = {
  tenThuoc: string;
  soLuong: number;
  donGia: number;
  giaVon: number; // 🔥 THÊM GIÁ VỐN
};

type RouteProps = RouteProp<RootStackParamList, "ThemHoaDon">;

export default function ThemHoaDonScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();

  const editingData = route.params?.data;

  const [khachHang, setKhachHang] = useState(editingData?.khachHang || "");
  const [nhanVien, setNhanVien] = useState(editingData?.nhanVien || "");
  const [giamGia, setGiamGia] = useState(editingData?.giamGia?.toString() || "0");
  const [thue, setThue] = useState(editingData?.thue?.toString() || "0");
  // 🔥 Lấy giaVon cho từng item nếu có (sẽ là 0 nếu không có)
  const [items, setItems] = useState<ItemType[]>(
    editingData?.items?.map((item: any) => ({
      ...item,
      giaVon: item.giaVon || 0, // Đảm bảo trường giaVon luôn có
    })) || []
  );

  const [tenThuoc, setTenThuoc] = useState("");
  const [soLuong, setSoLuong] = useState("");
  const [donGia, setDonGia] = useState("");
  const [giaVon, setGiaVon] = useState(""); // 🔥 State mới cho Giá vốn

  // ✅ Tính toán các giá trị tổng
  const tongTienHang = items.reduce((sum, i) => sum + i.soLuong * i.donGia, 0);
  const tongCong = tongTienHang - Number(giamGia || 0) + Number(thue || 0);
  
  // 🔥 TÍNH TOÁN TỔNG GIÁ VỐN
  const tongGiaVon = items.reduce((sum, i) => sum + i.soLuong * i.giaVon, 0);

  // ✅ Thêm thuốc vào danh sách
  const handleAddItem = () => {
    if (!tenThuoc || !soLuong || !donGia || !giaVon) { // 🔥 Check thêm giaVon
      Alert.alert("⚠️ Lỗi", "Vui lòng nhập đầy đủ thông tin (kể cả Giá vốn)");
      return;
    }
    setItems([
      ...items,
      {
        tenThuoc,
        soLuong: Number(soLuong),
        donGia: Number(donGia),
        giaVon: Number(giaVon), // 🔥 LƯU GIÁ VỐN
      },
    ]);
    setTenThuoc("");
    setSoLuong("");
    setDonGia("");
    setGiaVon(""); // 🔥 Reset Giá vốn
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

      // 🔥 Dữ liệu hóa đơn chung
      const invoiceData = {
        khachHang,
        nhanVien,
        giamGia: Number(giamGia || 0),
        thue: Number(thue || 0),
        tongTien: tongCong,
        // 🔥 LƯU THÊM TỔNG GIÁ VỐN
        tongGiaVon: tongGiaVon,
        items,
      };

      if (editingData) {
        // ✅ Cập nhật hóa đơn
        await updateDoc(doc(db, "hoadons", editingData.id), invoiceData);
        Alert.alert("✅ Thành công", "Cập nhật hóa đơn thành công!");
      } else {
        // --- 1. Thêm hóa đơn mới ---
        await addDoc(collection(db, "hoadons"), {
          ...invoiceData,
          ngayBan: serverTimestamp(),
        });

        // --- 2. CẬP NHẬT tongTienMua CỦA KHÁCH HÀNG (CRM) ---
        const customerQuery = query(
          collection(db, "khachhangs"),
          where("sdt", "==", khachHang)
        );

        const customerSnapshot = await getDocs(customerQuery);

        if (!customerSnapshot.empty) {
          const customerDoc = customerSnapshot.docs[0];
          const currentTotal = customerDoc.data().tongTienMua || 0;

          await updateDoc(customerDoc.ref, {
            tongTienMua: currentTotal + tongCong,
          });
          Alert.alert(
            "✅ Thành công",
            "Thêm hóa đơn & cập nhật khách hàng thành công!"
          );
        } else {
          Alert.alert(
            "⚠️ Cảnh báo",
            `Không tìm thấy khách hàng với SĐT/ID: ${khachHang} để cập nhật tổng tiền mua.`
          );
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
        {editingData ? "✏️ Chỉnh sửa hóa đơn" : "➕ Thêm hóa đơn thủ công"}
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
        style={[styles.input, { fontWeight: "bold", borderColor: "#4a90e2" }]}
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
          placeholder="Giá vốn" // 🔥 Ô nhập giá vốn
          value={giaVon}
          onChangeText={setGiaVon}
          keyboardType="numeric"
          style={[styles.input, { width: 90, marginBottom: 0, borderColor: 'orange' }]}
        />
        <TextInput
          placeholder="Đơn giá"
          value={donGia}
          onChangeText={setDonGia}
          keyboardType="numeric"
          style={[styles.input, { width: 90, marginBottom: 0 }]}
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
              <Text style={{ fontWeight: "600" }}>{item.tenThuoc}</Text>
              <Text style={{ fontSize: 13, color: "#666" }}>
                Giá vốn:{" "}
                <Text style={{ fontWeight: "bold", color: "#8B4513" }}>
                  {(item.soLuong * item.giaVon).toLocaleString()} VNĐ
                </Text>{" "}
                | Bán: {item.soLuong} x {item.donGia.toLocaleString()} ={" "}
                <Text style={{ fontWeight: "bold", color: "darkgreen" }}>
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
      <View style={styles.summaryContainer}>
        <Text style={styles.totalLabel}>
          Tổng Giá vốn:{" "}
          <Text style={styles.totalValue_GiaVon}>
            {tongGiaVon.toLocaleString()} VNĐ
          </Text>
        </Text>
        <Text style={styles.totalLabel}>
          Lãi ròng tạm tính:{" "}
          <Text style={styles.totalValue_LaiRong}>
            {(tongCong - tongGiaVon).toLocaleString()} VNĐ
          </Text>
        </Text>
        <Text style={styles.totalLabel}>
          Tổng thanh toán:{" "}
          <Text style={styles.totalValue_TongTien}>
            {tongCong.toLocaleString()} VNĐ
          </Text>
        </Text>
      </View>

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
    gap: 6,
  },
  addBtn: {
    backgroundColor: "#4a90e2",
    padding: 12,
    borderRadius: 8,
  },
  item: {
    backgroundColor: "#f8f8f8",
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  // 🔥 STYLE MỚI CHO TỔNG HỢP
  summaryContainer: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 16,
    textAlign: 'right',
    paddingRight: 5,
  },
  totalValue_GiaVon: {
    fontWeight: "bold",
    color: "#8B4513", // Nâu
  },
  totalValue_LaiRong: {
    fontWeight: "bold",
    color: "darkgreen",
    fontSize: 17,
  },
  totalValue_TongTien: {
    fontWeight: "bold",
    color: "#4a90e2", // Xanh dương
    fontSize: 18,
  },
  saveBtn: {
    backgroundColor: "#4a90e2",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
});