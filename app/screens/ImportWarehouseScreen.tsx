import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../firebaseConfig";

// Kiểu dữ liệu chi tiết cần thiết cho nhập kho
type ThuocDetailType = {
  id: string;
  ten: string;
  soluong: number; // Tổng tồn kho theo Đơn vị NHỎ
  donViTinh: string; // Đơn vị LỚN
  donViNho: string; // Đơn vị NHỎ
  heSoQuyDoi: number; // Hệ số quy đổi
  giaVon: number; // Giá vốn (Đơn vị LỚN)
};

export default function NhapKhoScreen({ navigation }: any) {
  const [thuocs, setThuocs] = useState<ThuocDetailType[]>([]);
  const [thuocChonId, setThuocChonId] = useState<string>("");
  const [soLuongNhapLon, setSoLuongNhapLon] = useState(""); // SL nhập theo Đơn vị LỚN
  const [giaNhapLon, setGiaNhapLon] = useState(""); // Giá nhập theo Đơn vị LỚN
  const [ngayNhap, setNgayNhap] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Lấy thông tin thuốc đang được chọn
  const selectedThuoc = thuocs.find(t => t.id === thuocChonId);

  // --- Lấy danh sách thuốc ---
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "thuocs"), (snapshot) => {
      const data: ThuocDetailType[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ten: doc.data().ten || 'Không tên',
        soluong: doc.data().soluong || 0, 
        donViTinh: doc.data().donViTinh || '', 
        donViNho: doc.data().donViNho || 'đơn vị nhỏ', 
        heSoQuyDoi: doc.data().heSoQuyDoi || 1,
        giaVon: doc.data().giaVon || 0,
      }));
      setThuocs(data);
    });
    return () => unsubscribe();
  }, []);

  // --- Hàm lưu phiếu nhập ---
  const handleSave = async () => {
    if (!thuocChonId || !soLuongNhapLon || !giaNhapLon) {
      Alert.alert("⚠️ Thiếu thông tin", "Vui lòng chọn thuốc, nhập số lượng và giá nhập.");
      return;
    }

    const soLuongLon = Number(soLuongNhapLon);
    const giaLon = Number(giaNhapLon);

    if (isNaN(soLuongLon) || soLuongLon <= 0) {
      Alert.alert("❌ Lỗi đầu vào", "Số lượng nhập phải là một số dương.");
      return;
    }
    if (isNaN(giaLon) || giaLon <= 0) {
      Alert.alert("❌ Lỗi đầu vào", "Giá nhập phải là một số tiền dương.");
      return;
    }

    if (!selectedThuoc) {
        Alert.alert("❌ Lỗi dữ liệu", "Không tìm thấy thông tin chi tiết của thuốc.");
        return;
    }

    setLoading(true);
    
    // Khai báo biến cần truy cập ngoài khối if (Fix lỗi: Cannot find name 'newGiaVonLon')
    let newGiaVonLon = selectedThuoc.giaVon || 0; 
    const heSoQuyDoi = selectedThuoc.heSoQuyDoi || 1;
    const soLuongNhoThem = soLuongLon * heSoQuyDoi;

    try {
      // 1️⃣ Lưu phiếu nhập kho (Lưu theo Đơn vị LỚN để dễ truy vết)
      await addDoc(collection(db, "nhapkho"), {
        thuocId: thuocChonId,
        soLuongNhapLon: soLuongLon, 
        giaNhapLon: giaLon, 
        donViTinh: selectedThuoc.donViTinh, 
        donViNho: selectedThuoc.donViNho,
        heSoQuyDoi: heSoQuyDoi,
        ngayNhap: ngayNhap,
        createdAt: serverTimestamp(),
      });

      // 2️⃣ Cập nhật số lượng thuốc và Giá vốn trong kho
      const thuocRef = doc(db, "thuocs", thuocChonId);
      const thuocSnap = await getDoc(thuocRef);
      
      if (thuocSnap.exists()) {
        const data = thuocSnap.data() as ThuocDetailType;
        
        // --- ⚙️ BẮT ĐẦU NGHIỆP VỤ KẾ TOÁN: TÍNH GIÁ VỐN BÌNH QUÂN GIA QUYỀN (WAC) ---
        
        // 1. Lấy tồn kho hiện tại (đơn vị NHỎ)
        const soLuongTonKhoHienTaiNho = data.soluong || 0;
        
        // 2. Chuyển đổi sang đơn vị LỚN để tính giá trị
        const QtyLonHienTai = soLuongTonKhoHienTaiNho / heSoQuyDoi;
        const GiaVonLonHienTai = data.giaVon || 0;
        
        // 3. Tính Tổng giá trị tồn cũ (Old Value)
        const OldValue = QtyLonHienTai * GiaVonLonHienTai;
        
        // 4. Tính Tổng giá trị nhập mới (New Import Value)
        const NewImportValue = soLuongLon * giaLon; // soLuongLon * giaNhapLon
        
        // 5. Tính Tổng số lượng LỚN mới (Total Quantity)
        const NewQtyLon = QtyLonHienTai + soLuongLon;

        if (NewQtyLon > 0) {
            // 6. Tính Giá vốn Bình quân Gia quyền (WAC)
            const NewTotalValue = OldValue + NewImportValue;
            newGiaVonLon = NewTotalValue / NewQtyLon;
        }

        // --- KẾT THÚC NGHIỆP VỤ KẾ TOÁN ---

        // Tổng tồn kho NHỎ mới
        const soLuongTonKhoMoiNho = soLuongTonKhoHienTaiNho + soLuongNhoThem;
        
        await updateDoc(thuocRef, { 
            soluong: soLuongTonKhoMoiNho, // Cập nhật tổng SL theo Đơn vị NHỎ
            giaVon: newGiaVonLon, // Cập nhật Giá vốn Bình quân mới
            ngayCapNhat: new Date(),
        });
      }

      // Thông báo sử dụng giá vốn mới đã tính toán
      Alert.alert("✅ Nhập kho thành công", `Đã nhập ${soLuongLon} ${selectedThuoc.donViTinh} (${soLuongNhoThem} ${selectedThuoc.donViNho}) vào kho. Giá vốn bình quân mới là ${newGiaVonLon.toLocaleString('vi-VN')} VNĐ/${selectedThuoc.donViTinh}.`);
      setThuocChonId("");
      setSoLuongNhapLon("");
      setGiaNhapLon("");
      setNgayNhap(new Date());

      // Chuyển sang Lịch sử nhập kho (nếu có)
      // navigation.navigate("LichSuNhapKho");
    } catch (error) {
      console.error("Lỗi khi lưu phiếu nhập:", error);
      Alert.alert("❌ Lỗi", "Không thể lưu phiếu nhập kho. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}><MaterialIcons name="inventory" size={24} color="#4a90e2" /> Phiếu Nhập kho thuốc</Text>

      {/* --- 1. Chọn thuốc --- */}
      <Text style={styles.label}>Tên thuốc (*)</Text>
      <View style={styles.pickerContainer}>
          <Picker
            selectedValue={thuocChonId}
            onValueChange={(val) => setThuocChonId(String(val))}
            style={styles.picker}
          >
            <Picker.Item label="-- Chọn thuốc cần nhập --" value="" />
            {thuocs.map((t) => (
              <Picker.Item key={t.id} label={t.ten} value={t.id} />
            ))}
          </Picker>
      </View>
      
      {/* --- Hiển thị thông tin tồn kho và đơn vị --- */}
      {selectedThuoc && (
        <View style={styles.infoBox}>
            <Text style={styles.infoText}>
                Tồn kho hiện tại: <Text style={{fontWeight: 'bold', color: '#007aff'}}>{(selectedThuoc.soluong / selectedThuoc.heSoQuyDoi).toLocaleString('vi-VN')}</Text> {selectedThuoc.donViTinh} (Tổng {selectedThuoc.soluong.toLocaleString('vi-VN')} {selectedThuoc.donViNho})
            </Text>
            <Text style={styles.infoText}>
                Đơn vị nhập: <Text style={{fontWeight: 'bold'}}>{selectedThuoc.donViTinh}</Text> (1 {selectedThuoc.donViTinh} = {selectedThuoc.heSoQuyDoi} {selectedThuoc.donViNho})
            </Text>
            <Text style={styles.infoText}>
                Giá vốn cũ (ĐV LỚN): <Text style={{fontWeight: 'bold'}}>{selectedThuoc.giaVon.toLocaleString('vi-VN')} VNĐ</Text>
            </Text>
        </View>
      )}


      {/* --- 2. Số lượng nhập (Đơn vị LỚN) --- */}
      <Text style={styles.label}>Số lượng nhập (Đơn vị LỚN: {selectedThuoc?.donViTinh || '...'}) (*)</Text>
      <TextInput
        value={soLuongNhapLon}
        onChangeText={setSoLuongNhapLon}
        keyboardType="numeric"
        style={styles.input}
        placeholder={`Nhập số lượng theo ${selectedThuoc?.donViTinh || 'Đơn vị LỚN'}`}
      />

      {/* --- 3. Giá nhập (Đơn vị LỚN) --- */}
      <Text style={styles.label}>Giá nhập (VNĐ) (Theo Đơn vị LỚN) (*)</Text>
      <TextInput
        value={giaNhapLon}
        onChangeText={setGiaNhapLon}
        keyboardType="numeric"
        style={styles.input}
        placeholder={`Giá nhập của 1 ${selectedThuoc?.donViTinh || 'Đơn vị LỚN'}`}
      />

      {/* --- 4. Ngày nhập --- */}
      <Text style={styles.label}>Ngày nhập (*)</Text>
      <TouchableOpacity
        onPress={() => setShowDatePicker(true)}
        style={styles.dateButton}
      >
        <MaterialIcons name="calendar-today" size={16} color="#4a90e2" />
        <Text style={{ marginLeft: 8 }}>{ngayNhap.toLocaleDateString('vi-VN')}</Text>
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

      {/* --- Nút Lưu --- */}
      <TouchableOpacity 
        style={[styles.button, loading && { opacity: 0.6 }]} 
        onPress={handleSave} 
        disabled={loading}
      >
        {loading ? (
            <ActivityIndicator color="#fff" />
        ) : (
            <>
                <MaterialIcons name="save" size={24} color="#fff" />
                <Text style={styles.buttonText}>Lưu phiếu nhập & Cập nhật kho</Text>
            </>
        )}
      </TouchableOpacity>
      
      <View style={{height: 50}} /> 
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9", padding: 16 },
  title: { 
    fontSize: 22, 
    fontWeight: "bold", 
    marginBottom: 20, 
    textAlign: "center",
    color: "#333",
  },
  label: { marginTop: 15, fontWeight: "bold", color: '#555' },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 6,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginTop: 6,
  },
  button: {
    backgroundColor: "#4a90e2", 
    padding: 15,
    borderRadius: 10,
    marginTop: 30,
    alignItems: "center",
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 18, marginLeft: 10 },
  infoBox: {
    backgroundColor: '#e6f7ff',
    borderLeftColor: '#4a90e2',
    borderLeftWidth: 4,
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333'
  }
});