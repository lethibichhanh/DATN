import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { exportKiemKhoToExcel } from "../../utils/exportToExcel";
import { exportKiemKhoToPDF } from "../../utils/exportToPDF"; 
import type { Thuoc, RootStackParamList } from "../../types";

// ✅ Hàm parse ngày từ chuỗi "DD-MM-YYYY" hoặc "YYYY-MM-DD"
const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  let parts: string[] = [];
  if (dateStr.includes("-")) parts = dateStr.split("-");
  else if (dateStr.includes("/")) parts = dateStr.split("/");
  else return null;

  if (parts[0].length === 4) {
    // format YYYY-MM-DD
    const [year, month, day] = parts.map(Number);
    return new Date(year, month - 1, day);
  } else {
    // format DD-MM-YYYY
    const [day, month, year] = parts.map(Number);
    return new Date(year, month - 1, day);
  }
};

// ✅ Thuốc đã hết hạn
const isHetHan = (hanSuDung: string) => {
  const today = new Date();
  const expiry = parseDate(hanSuDung);
  if (!expiry) return false;
  return expiry.getTime() < today.getTime();
};

// ✅ Thuốc sắp hết hạn (<= 30 ngày nhưng chưa hết)
const isSapHetHan = (hanSuDung: string) => {
  const today = new Date();
  const expiry = parseDate(hanSuDung);
  if (!expiry) return false;
  const diff = (expiry.getTime() - today.getTime()) / (1000 * 3600 * 24);
  return diff >= 0 && diff < 30;
};

export default function KiemKhoScreen() {
  const [thuocs, setThuocs] = useState<Thuoc[]>([]);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState<Thuoc[]>([]);
  const [filterMode, setFilterMode] = useState<"all" | "low" | "expired" | "outdated">("all");

  const [editingThuoc, setEditingThuoc] = useState<Thuoc | null>(null);
  const [newSoLuong, setNewSoLuong] = useState("");
  const [newHanSuDung, setNewHanSuDung] = useState("");

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Lấy dữ liệu từ Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "thuocs"), (snapshot) => {
      const data: Thuoc[] = snapshot.docs.map((doc) => {
        const thuoc = doc.data() as Omit<Thuoc, "id">;
        return { id: doc.id, ...thuoc };
      });
      setThuocs(data);
    });
    return () => unsub();
  }, []);

  // Lọc dữ liệu
  useEffect(() => {
    let data = thuocs;

    if (search.trim()) {
      data = data.filter((item) =>
        item.ten.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (filterMode === "low") {
      data = data.filter((item) => item.soluong <= 10);
    }

    if (filterMode === "expired") {
      data = data.filter((item) => isSapHetHan(item.hanSuDung));
    }

    if (filterMode === "outdated") {
      data = data.filter((item) => isHetHan(item.hanSuDung));
    }

    setFiltered(data);
  }, [search, thuocs, filterMode]);

  // Xuất Excel
  const handleExportExcel = async () => {
    try {
      await exportKiemKhoToExcel(filtered);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể xuất file Excel");
    }
  };

  // Xuất PDF
  const handleExportPDF = async () => {
    try {
      await exportKiemKhoToPDF(filtered);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể xuất file PDF");
    }
  };

  // Xóa thuốc
  const handleDelete = async (id: string) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa thuốc này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          await deleteDoc(doc(db, "thuocs", id));
        },
      },
    ]);
  };

  // Lưu chỉnh sửa
  const handleSaveEdit = async () => {
    if (!editingThuoc) return;
    await updateDoc(doc(db, "thuocs", editingThuoc.id), {
      soluong: Number(newSoLuong),
      hanSuDung: newHanSuDung,
    });
    setEditingThuoc(null);
  };

  // Render từng thuốc
  const renderItem = ({ item }: { item: Thuoc }) => {
    let bgColor = "#f9f9f9";
    if (item.soluong <= 10) bgColor = "#f8d7da"; // sắp hết
    else if (isHetHan(item.hanSuDung)) bgColor = "#f5c6cb"; // đỏ đậm hết hạn
    else if (isSapHetHan(item.hanSuDung)) bgColor = "#fff3cd"; // vàng nhạt sắp hết hạn
    else bgColor = "#d4edda"; // xanh an toàn

    return (
      <View style={[styles.card, { backgroundColor: bgColor }]}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => navigation.navigate("ChiTietThuoc", { thuoc: item })}
        >
          <Text style={styles.name}>💊 {item.ten}</Text>
          <Text>Số lượng: {item.soluong}</Text>
          <Text>Hạn sử dụng: {item.hanSuDung}</Text>
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: "orange" }]}
            onPress={() => {
              setEditingThuoc(item);
              setNewSoLuong(item.soluong.toString());
              setNewHanSuDung(item.hanSuDung);
            }}
          >
            <Text style={{ color: "#fff" }}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: "red" }]}
            onPress={() => handleDelete(item.id)}
          >
            <Text style={{ color: "#fff" }}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📊 Kiểm kho</Text>

      <TextInput
        style={styles.search}
        placeholder="🔍 Tìm theo tên thuốc..."
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterBtn, filterMode === "all" && styles.filterActive]}
          onPress={() => setFilterMode("all")}
        >
          <Text>Tất cả</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filterMode === "low" && styles.filterActive]}
          onPress={() => setFilterMode("low")}
        >
          <Text>⚠️ Sắp hết</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filterMode === "expired" && styles.filterActive]}
          onPress={() => setFilterMode("expired")}
        >
          <Text>📅 Sắp hết hạn</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filterMode === "outdated" && styles.filterActive]}
          onPress={() => setFilterMode("outdated")}
        >
          <Text>❌ Đã hết hạn</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 10 }}>
        <TouchableOpacity style={[styles.exportBtn, { backgroundColor: "#28a745" }]} onPress={handleExportExcel}>
          <Text style={{ color: "#fff" }}>📤 Xuất Excel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.exportBtn, { backgroundColor: "#dc3545" }]} onPress={handleExportPDF}>
          <Text style={{ color: "#fff" }}>📑 Xuất PDF</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
      />

      {/* Modal chỉnh sửa */}
      <Modal visible={!!editingThuoc} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>✏️ Chỉnh sửa thuốc</Text>

            <TextInput
              value={newSoLuong}
              onChangeText={setNewSoLuong}
              keyboardType="numeric"
              placeholder="Số lượng"
              style={styles.input}
            />
            <TextInput
              value={newHanSuDung}
              onChangeText={setNewHanSuDung}
              placeholder="Hạn sử dụng (YYYY-MM-DD)"
              style={styles.input}
            />

            <View style={{ flexDirection: "row", marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: "green", flex: 1 }]}
                onPress={handleSaveEdit}
              >
                <Text style={{ color: "#fff" }}>💾 Lưu</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: "gray", flex: 1 }]}
                onPress={() => setEditingThuoc(null)}
              >
                <Text style={{ color: "#fff" }}>❌ Hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "600", textAlign: "center", marginBottom: 10 },
  search: {
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: "#e6e6e6",
    borderRadius: 6,
  },
  filterActive: {
    backgroundColor: "#4a90e2",
  },
  exportBtn: {
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  name: { fontSize: 16, fontWeight: "500" },
  actions: {
    flexDirection: "row",
    marginLeft: 10,
  },
  btn: {
    padding: 8,
    borderRadius: 6,
    marginHorizontal: 4,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "80%",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
});
