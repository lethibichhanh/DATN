import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { deleteDoc, doc } from "firebase/firestore";
import React from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../firebaseConfig";

import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../types";

type ItemType = {
  tenThuoc: string;
  soLuong: number;
  donGia: number;
};

type ChiTietHoaDonProps = {
  id: string;
  ngayBan: { seconds: number };
  tongTien: number;
  nhanVien?: string;
  khachHang?: string;
  giamGia?: number;
  thue?: number;
  items: ItemType[];
};

// 🔹 Định nghĩa type cho navigation và route
type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "ChiTietHoaDon"
>;
type RouteProps = RouteProp<RootStackParamList, "ChiTietHoaDon">;

export default function ChiTietHoaDonScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { data } = route.params;

  // ✅ Tính toán tổng tiền
  const tongTienHang = data.items.reduce(
    (sum, i) => sum + i.donGia * i.soLuong,
    0
  );
  const giamGia = data.giamGia || 0;
  const thue = data.thue || 0;
  const tongCong = tongTienHang - giamGia + thue;

  // ✅ Xuất PDF
  const handleExportPDF = async () => {
    const html = `
      <h1 style="text-align:center;">💊 HÓA ĐƠN BÁN THUỐC</h1>
      <p><b>Mã hóa đơn:</b> ${data.id}</p>
      <p><b>Ngày bán:</b> ${new Date(
        data.ngayBan.seconds * 1000
      ).toLocaleString()}</p>
      <p><b>Nhân viên:</b> ${data.nhanVien || "N/A"}</p>
      <p><b>Khách hàng:</b> ${data.khachHang || "Khách lẻ"}</p>
      <hr/>
      <table border="1" style="border-collapse:collapse; width:100%; text-align:center;">
        <tr>
          <th>Tên thuốc</th><th>Số lượng</th><th>Đơn giá (VNĐ)</th><th>Thành tiền (VNĐ)</th>
        </tr>
        ${data.items
          .map(
            (item) =>
              `<tr>
                <td>${item.tenThuoc}</td>
                <td>${item.soLuong}</td>
                <td>${item.donGia.toLocaleString()}</td>
                <td>${(item.soLuong * item.donGia).toLocaleString()}</td>
              </tr>`
          )
          .join("")}
      </table>
      <hr/>
      <p><b>Tổng tiền hàng:</b> ${tongTienHang.toLocaleString()} VNĐ</p>
      <p><b>Giảm giá:</b> ${giamGia.toLocaleString()} VNĐ</p>
      <p><b>Thuế:</b> ${thue.toLocaleString()} VNĐ</p>
      <h2 style="color:green;">✅ Tổng cộng: ${tongCong.toLocaleString()} VNĐ</h2>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };

  // ✅ Xóa hóa đơn
  const handleDelete = async () => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa hóa đơn này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          await deleteDoc(doc(db, "hoadons", data.id));
          navigation.goBack();
        },
      },
    ]);
  };

  // ✅ Chỉnh sửa hóa đơn
  const handleEdit = () => {
    navigation.navigate("ThemHoaDon", { data }); // ⚡ Giờ TS hiểu đúng type
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧾 Chi tiết hóa đơn</Text>
      <Text style={styles.info}>🆔 Mã hóa đơn: {data.id}</Text>
      <Text style={styles.info}>
        🕒 Ngày bán: {new Date(data.ngayBan.seconds * 1000).toLocaleString()}
      </Text>
      <Text style={styles.info}>👨‍⚕️ Nhân viên: {data.nhanVien || "N/A"}</Text>
      <Text style={styles.info}>
        🙍‍♂️ Khách hàng: {data.khachHang || "Khách lẻ"}
      </Text>

      {/* Danh sách thuốc */}
      <FlatList
        data={data.items}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemName}>🔹 {item.tenThuoc}</Text>
            <Text>Số lượng: {item.soLuong}</Text>
            <Text>Đơn giá: {item.donGia.toLocaleString()} VNĐ</Text>
            <Text>
              Thành tiền: {(item.donGia * item.soLuong).toLocaleString()} VNĐ
            </Text>
          </View>
        )}
      />

      {/* Tổng hợp */}
      <View style={styles.footer}>
        <Text style={styles.summary}>
          💵 Tổng tiền hàng: {tongTienHang.toLocaleString()} VNĐ
        </Text>
        <Text style={styles.summary}>
          💸 Giảm giá: {giamGia.toLocaleString()} VNĐ
        </Text>
        <Text style={styles.summary}>
          📊 Thuế: {thue.toLocaleString()} VNĐ
        </Text>
        <Text style={styles.total}>
          ✅ Tổng cộng: {tongCong.toLocaleString()} VNĐ
        </Text>
      </View>

      {/* Các nút hành động */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btn} onPress={handleExportPDF}>
          <Text style={styles.btnText}>📤 Xuất PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: "orange" }]}
          onPress={handleEdit}
        >
          <Text style={styles.btnText}>✏️ Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: "red" }]}
          onPress={handleDelete}
        >
          <Text style={styles.btnText}>🗑️ Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 12 },
  info: { fontSize: 16, marginBottom: 6 },
  item: {
    backgroundColor: "#f8f8f8",
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
  },
  itemName: { fontWeight: "bold", marginBottom: 4 },
  footer: { marginTop: 12, padding: 10, borderTopWidth: 1, borderColor: "#ccc" },
  summary: { fontSize: 16 },
  total: { fontSize: 18, fontWeight: "bold", marginTop: 6, color: "green" },
  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
  },
  btn: { backgroundColor: "#4a90e2", padding: 12, borderRadius: 8 },
  btnText: { color: "#fff", fontWeight: "bold" },
});
