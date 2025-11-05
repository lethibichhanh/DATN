import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";

type ThuocType = {
  id: string;
  ten: string;
  soluong: number;
};

export default function NhapKhoScreen({ navigation }: any) {
  const [thuocs, setThuocs] = useState<ThuocType[]>([]);
  const [thuocChon, setThuocChon] = useState<string>("");
  const [soLuong, setSoLuong] = useState("");
  const [giaNhap, setGiaNhap] = useState("");
  const [ngayNhap, setNgayNhap] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // lấy danh sách thuốc
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "thuocs"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      })) as ThuocType[];
      setThuocs(data);
    });
    return () => unsubscribe();
  }, []);

  // Lưu phiếu nhập
  const handleSave = async () => {
    if (!thuocChon || !soLuong || !giaNhap) {
      Alert.alert("⚠️ Vui lòng nhập đầy đủ thông tin");
      return;
    }

    try {
      // 1️⃣ lưu phiếu nhập kho
      await addDoc(collection(db, "nhapkho"), {
        thuocId: thuocChon,
        soLuong: Number(soLuong),
        giaNhap: Number(giaNhap),
        ngayNhap: ngayNhap,
        createdAt: serverTimestamp(),
      });

      // 2️⃣ cập nhật số lượng thuốc trong kho
      const thuocRef = doc(db, "thuocs", thuocChon);
      const thuocSnap = await getDoc(thuocRef);
      if (thuocSnap.exists()) {
        const data = thuocSnap.data() as ThuocType;
        const soLuongMoi = (data.soluong || 0) + Number(soLuong);
        await updateDoc(thuocRef, { soluong: soLuongMoi });
      }

      Alert.alert("✅ Thành công", "Đã lưu phiếu nhập kho");
      setThuocChon("");
      setSoLuong("");
      setGiaNhap("");
      setNgayNhap(new Date());

      // 👉 chuyển thẳng sang Lịch sử nhập kho
      navigation.navigate("LichSuNhapKho");
    } catch (error) {
      console.error(error);
      Alert.alert("❌ Lỗi", "Không thể lưu phiếu nhập kho");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📦 Nhập kho thuốc</Text>

      <Text style={styles.label}>Chọn thuốc:</Text>
      <Picker
        selectedValue={thuocChon}
        onValueChange={(val) => setThuocChon(val)}
        style={styles.input}
      >
        <Picker.Item label="-- Chọn thuốc --" value="" />
        {thuocs.map((t) => (
          <Picker.Item key={t.id} label={t.ten} value={t.id} />
        ))}
      </Picker>

      <Text style={styles.label}>Số lượng:</Text>
      <TextInput
        value={soLuong}
        onChangeText={setSoLuong}
        keyboardType="numeric"
        style={styles.input}
        placeholder="Nhập số lượng"
      />

      <Text style={styles.label}>Giá nhập (VNĐ):</Text>
      <TextInput
        value={giaNhap}
        onChangeText={setGiaNhap}
        keyboardType="numeric"
        style={styles.input}
        placeholder="Nhập giá nhập"
      />

      <Text style={styles.label}>Ngày nhập:</Text>
      <TouchableOpacity
        onPress={() => setShowDatePicker(true)}
        style={styles.dateButton}
      >
        <Text>{ngayNhap.toLocaleDateString()}</Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={ngayNhap}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setNgayNhap(date);
          }}
        />
      )}

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>💾 Lưu phiếu nhập</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 12, textAlign: "center" },
  label: { marginTop: 10, fontWeight: "bold" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
    alignItems: "center",
  },
  button: {
    backgroundColor: "#4a90e2",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "bold" },
});
