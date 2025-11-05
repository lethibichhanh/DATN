import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { db } from "../../firebaseConfig";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  deleteDoc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function LichSuNhapKhoScreen() {
  const [lichSu, setLichSu] = useState<any[]>([]);
  const [thuocs, setThuocs] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [newSoLuong, setNewSoLuong] = useState("");
  const [newGiaNhap, setNewGiaNhap] = useState("");

  // 🔍 tìm kiếm & lọc ngày
  const [searchText, setSearchText] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // lấy danh sách phiếu nhập
  useEffect(() => {
    const q = query(collection(db, "nhapkho"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLichSu(data);
    });
    return () => unsubscribe();
  }, []);

  // lấy danh sách thuốc
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "thuocs"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setThuocs(data);
    });
    return () => unsubscribe();
  }, []);

  // Xóa phiếu nhập
  const handleDelete = async (item: any) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa phiếu nhập này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          const thuocRef = doc(db, "thuocs", item.thuocId);
          const thuocSnap = await getDoc(thuocRef);
          if (thuocSnap.exists()) {
            const data = thuocSnap.data() as any;
            const soLuongMoi = (data.soluong || 0) - item.soLuong;
            await updateDoc(thuocRef, { soluong: Math.max(soLuongMoi, 0) });
          }
          await deleteDoc(doc(db, "nhapkho", item.id));
        },
      },
    ]);
  };

  // Mở modal sửa
  const openEditModal = (item: any) => {
    setEditingItem(item);
    setNewSoLuong(item.soLuong.toString());
    setNewGiaNhap(item.giaNhap.toString());
  };

  // Lưu chỉnh sửa
  const handleSaveEdit = async () => {
    if (!editingItem) return;

    const soLuongMoi = Number(newSoLuong);
    const giaNhapMoi = Number(newGiaNhap);

    await updateDoc(doc(db, "nhapkho", editingItem.id), {
      soLuong: soLuongMoi,
      giaNhap: giaNhapMoi,
    });

    const thuocRef = doc(db, "thuocs", editingItem.thuocId);
    const thuocSnap = await getDoc(thuocRef);
    if (thuocSnap.exists()) {
      const data = thuocSnap.data() as any;
      const soLuongCapNhat =
        (data.soluong || 0) - editingItem.soLuong + soLuongMoi;
      await updateDoc(thuocRef, { soluong: Math.max(soLuongCapNhat, 0) });
    }

    setEditingItem(null);
  };

  // Lọc dữ liệu
  const filteredData = lichSu.filter((item) => {
    const thuoc = thuocs.find((t) => t.id === item.thuocId);
    const tenThuoc = thuoc?.ten?.toLowerCase() || "";

    const matchText = tenThuoc.includes(searchText.toLowerCase());

    const ngayNhap =
      item.ngayNhap?.toDate?.() || new Date(item.ngayNhap || Date.now());
    const matchStart = startDate ? ngayNhap >= startDate : true;
    const matchEnd = endDate ? ngayNhap <= endDate : true;

    return matchText && matchStart && matchEnd;
  });

  const renderItem = ({ item }: any) => {
    const thuoc = thuocs.find((t) => t.id === item.thuocId);
    return (
      <View style={styles.item}>
        <Text style={styles.title}>💊 {thuoc?.ten || "Không xác định"}</Text>
        <Text>📦 SL: {item.soLuong}</Text>
        <Text>💰 Giá: {item.giaNhap?.toLocaleString()} VNĐ</Text>
        <Text>
          🕒 Ngày nhập:{" "}
          {item.ngayNhap?.toDate?.()?.toLocaleDateString() || item.ngayNhap}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: "orange" }]}
            onPress={() => openEditModal(item)}
          >
            <Text style={{ color: "#fff" }}>✏️ Sửa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: "red" }]}
            onPress={() => handleDelete(item)}
          >
            <Text style={{ color: "#fff" }}>🗑️ Xóa</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>📜 Lịch sử nhập kho</Text>

      {/* Ô tìm kiếm */}
      <TextInput
        placeholder="🔍 Tìm theo tên thuốc..."
        style={styles.searchInput}
        value={searchText}
        onChangeText={setSearchText}
      />

      {/* Bộ lọc ngày */}
      <View style={styles.dateFilter}>
        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => setShowStartPicker(true)}
        >
          <Text>{startDate ? startDate.toLocaleDateString() : "📅 Từ ngày"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => setShowEndPicker(true)}
        >
          <Text>{endDate ? endDate.toLocaleDateString() : "📅 Đến ngày"}</Text>
        </TouchableOpacity>
      </View>

      {showStartPicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowStartPicker(false);
            if (selectedDate) setStartDate(selectedDate);
          }}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowEndPicker(false);
            if (selectedDate) setEndDate(selectedDate);
          }}
        />
      )}

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 20 }}>
            Không có dữ liệu
          </Text>
        }
      />

      {/* Modal chỉnh sửa */}
      <Modal visible={!!editingItem} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
              ✏️ Chỉnh sửa phiếu nhập
            </Text>

            <TextInput
              value={newSoLuong}
              onChangeText={setNewSoLuong}
              keyboardType="numeric"
              placeholder="Số lượng"
              style={styles.input}
            />
            <TextInput
              value={newGiaNhap}
              onChangeText={setNewGiaNhap}
              keyboardType="numeric"
              placeholder="Giá nhập"
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
                onPress={() => setEditingItem(null)}
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
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  dateFilter: {
    flexDirection: "row",
    marginBottom: 10,
    justifyContent: "space-between",
  },
  dateBtn: {
    flex: 1,
    backgroundColor: "#eee",
    padding: 10,
    alignItems: "center",
    borderRadius: 8,
    marginHorizontal: 4,
  },
  item: {
    backgroundColor: "#f0f4f8",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  title: { fontSize: 16, fontWeight: "bold" },
  actions: {
    flexDirection: "row",
    marginTop: 8,
    justifyContent: "space-around",
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
