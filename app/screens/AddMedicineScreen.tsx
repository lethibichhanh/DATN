import { Picker } from '@react-native-picker/picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { db } from '../../firebaseConfig';

// Kiểu dữ liệu cho đơn vị tính quy đổi
interface DonViQuyDoi {
  ten: string;
  donViNho: string;
  heSoQuyDoi: number;
}

// Hàm làm tròn số tiền cho giá bán lẻ
const formatPrice = (price: number) => {
    return price.toFixed(0); // Làm tròn về số nguyên
};


export default function ThemThuocScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editingId = route.params?.id;

  // --- State chính ---
  const [ten, setTen] = useState('');
  const [soluong, setSoLuong] = useState(''); // SỐ LƯỢNG NHẬP KHO (Đơn vị LỚN)
  const [ghiChu, setGhiChu] = useState('');
  const [moTa, setMoTa] = useState('');
  const [hanSuDung, setHanSuDung] = useState('');
  const [giaBan, setGiaBan] = useState('');
  const [giaVon, setGiaVon] = useState(''); 
  const [giaBanLe, setGiaBanLe] = useState('');
  const [maHang, setMaHang] = useState('');
  const [soDangKy, setSoDangKy] = useState(''); // Số đăng ký
  const [nhaSanXuat, setNhaSanXuat] = useState(''); // Nhà sản xuất
  const [donViTinh, setDonViTinh] = useState<string>('');
  const [xuatXu, setXuatXu] = useState('');
  const [danhMuc, setDanhMuc] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [qrValue, setQrValue] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const [donViQuyDoiList, setDonViQuyDoiList] = useState<DonViQuyDoi[]>([]);
  const [xuatXuList, setXuatXuList] = useState<string[]>([]);
  const [danhMucList, setDanhMucList] = useState<string[]>([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [tempUrl, setTempUrl] = useState('');

  // --- Load dữ liệu thuốc khi chỉnh sửa (FIXED LOGIC) ---
  useEffect(() => {
    if (editingId) {
      const fetchData = async () => {
        const docRef = doc(db, 'thuocs', editingId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          
          // 🔥 FIX: Khi load, cần tính ngược: Số lượng LỚN = Tổng SL Nhỏ / Hệ số quy đổi
          const heSoQuyDoi = data.heSoQuyDoi || 1;
          const soLuongHienThi = heSoQuyDoi > 0 ? (data.soluong / heSoQuyDoi).toFixed(0).toString() : '';

          setTen(data.ten || '');
          setSoLuong(soLuongHienThi); // ✅ LOAD: Hiển thị số lượng theo đơn vị LỚN
          setHanSuDung(data.hanSuDung || '');
          setGiaBan(data.giaBan?.toString() || '');
          setGiaVon(data.giaVon?.toString() || '');
          setGiaBanLe(data.giaBanLe?.toString() || '');
          setMaHang(data.maHang || '');
          setSoDangKy(data.soDangKy || '');
          setNhaSanXuat(data.nhaSanXuat || '');
          setDonViTinh(data.donViTinh || '');
          setXuatXu(data.xuatXu || '');
          setDanhMuc(data.danhMuc || '');
          setGhiChu(data.ghiChu || '');
          setMoTa(data.moTa || '');
          setImage(data.imageUrl || null);
          setQrValue(data.qrValue || '');
        }
      };
      fetchData();
    }
  }, [editingId]);

  // --- Load danh mục, xuất xứ, đơn vị ---
  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'xuatxu'), snap => {
      setXuatXuList(snap.docs.map(doc => doc.data().ten));
    });

    const unsub2 = onSnapshot(collection(db, 'danhmucs'), snap => {
      setDanhMucList(snap.docs.map(doc => doc.data().ten));
    });

    const unsub3 = onSnapshot(collection(db, 'donvitinh'), snap => {
      const data: DonViQuyDoi[] = snap.docs
        .map(doc => {
          const docData = doc.data();
          return {
            ten: docData.ten?.toString() ?? '',
            donViNho: docData.donViNho?.toString() ?? '',
            heSoQuyDoi: docData.heSoQuyDoi ?? 0,
          };
        })
        .filter(item => item.ten.length > 0);
      setDonViQuyDoiList(data);
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  // --- LOGIC TỰ ĐỘNG TÍNH GIÁ BÁN LẺ (Giá Đơn vị nhỏ) ---
  useEffect(() => {
    const giaBanFloat = parseFloat(giaBan);
    if (isNaN(giaBanFloat) || giaBanFloat <= 0) {
        setGiaBanLe('');
        return;
    }

    const selectedUnit = donViQuyDoiList.find(unit => unit.ten === donViTinh);
    if (selectedUnit && selectedUnit.heSoQuyDoi > 0) {
        // Công thức: Giá Bán Lẻ = Giá Bán Lớn / Hệ số quy đổi
        const calculatedGiaBanLe = giaBanFloat / selectedUnit.heSoQuyDoi;
        setGiaBanLe(formatPrice(calculatedGiaBanLe));
    } else {
        setGiaBanLe('');
    }
  }, [giaBan, donViTinh, donViQuyDoiList]);


  // --- Chọn ảnh (Không thay đổi) ---
  const pickImage = async () => {
    Alert.alert('Chọn ảnh', 'Bạn muốn lấy ảnh từ đâu?', [
      {
        text: '📷 Chụp ảnh',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Quyền bị từ chối', 'Cần quyền truy cập camera');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.8,
          });
          if (!result.canceled) setImage(result.assets[0].uri);
        },
      },
      {
        text: '🖼️ Từ thư viện',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Quyền bị từ chối', 'Cần quyền truy cập thư viện ảnh');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          });
          if (!result.canceled) setImage(result.assets[0].uri);
        },
      },
      {
        text: '🔗 Nhập URL công khai',
        onPress: () => setModalVisible(true),
      },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  // --- Lưu thuốc (FIXED LOGIC) ---
  const handleSave = async () => {
    if (!ten.trim() || !soluong || !hanSuDung || !giaBan || !giaVon || !donViTinh || !danhMuc) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin bắt buộc (Tên, SL, HSD, Giá Bán, Giá Vốn, ĐVT, Danh Mục).');
      return;
    }

    // Kiểm tra định dạng số
    if (isNaN(parseFloat(soluong)) || isNaN(parseFloat(giaBan)) || isNaN(parseFloat(giaVon))) {
        Alert.alert('Lỗi', 'Số lượng, Giá bán và Giá vốn phải là số hợp lệ.');
        return;
    }

    // Kiểm tra giá bán lẻ được tính
    if (!giaBanLe || isNaN(parseFloat(giaBanLe))) {
        Alert.alert('Lỗi', 'Không thể tính Giá bán lẻ. Vui lòng kiểm tra Giá bán (Đơn vị LỚN) và Hệ số Quy đổi.');
        return;
    }

    const selectedUnit = donViQuyDoiList.find(unit => unit.ten === donViTinh);
    if (!selectedUnit) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin đơn vị tính.');
      return;
    }
    
    // 🔥 FIX LOGIC: Tính toán tổng số lượng theo Đơn vị NHỎ (Viên) để lưu tồn kho
    const soLuongLon = parseInt(soluong); // Số lượng LỚN người dùng nhập (ví dụ: 20 Lọ)
    const heSoQuyDoi = selectedUnit.heSoQuyDoi; // Hệ số quy đổi (ví dụ: 30)
    const tongSoLuongNho = soLuongLon * heSoQuyDoi; // Tổng số lượng tồn kho (ví dụ: 600 Viên)

    setLoading(true);
    try {
      let imageUrl = image;
      if (imageUrl && imageUrl.startsWith('file://')) imageUrl = '';

      const qrData = maHang.trim() || `${ten}_${selectedUnit.donViNho}_${Date.now()}`;
      setQrValue(qrData);

      const thuocData = {
        ten,
        // ✅ THAY ĐỔI: LƯU TỔNG SỐ LƯỢNG THEO ĐƠN VỊ NHỎ để quản lý tồn kho bán lẻ
        soluong: tongSoLuongNho,
        hanSuDung,
        giaBan: parseFloat(giaBan), // Giá LỚN
        giaVon: parseFloat(giaVon), // Giá LỚN
        giaBanLe: parseFloat(giaBanLe), // Giá NHỎ (tự động tính)
        maHang: maHang.trim() || '',
        soDangKy: soDangKy.trim() || '', // SỐ ĐĂNG KÝ
        nhaSanXuat: nhaSanXuat.trim() || '', // NHÀ SẢN XUẤT
        donViTinh: selectedUnit.ten, // Đơn vị LỚN (Lọ)
        donViNho: selectedUnit.donViNho, // Đơn vị NHỎ (Viên)
        heSoQuyDoi: selectedUnit.heSoQuyDoi,
        xuatXu,
        danhMuc,
        ghiChu: ghiChu || '',
        moTa: moTa || '',
        imageUrl: imageUrl || '',
        qrValue: qrData,
        ngayTao: editingId ? (await getDoc(doc(db, 'thuocs', editingId))).data()?.ngayTao : new Date(), 
        ngayCapNhat: new Date(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'thuocs', editingId), thuocData);
        Alert.alert('✅ Thành công', 'Đã cập nhật thuốc');
      } else {
        const { ngayCapNhat, ...newDataWithoutUpdateDate } = thuocData;
        
        await addDoc(collection(db, 'thuocs'), newDataWithoutUpdateDate);
        Alert.alert('✅ Thành công', 'Đã thêm thuốc mới');
      }

      navigation.goBack();
    } catch (error) {
      console.error('🔥 Lỗi lưu Firestore:', error);
      Alert.alert('❌ Lỗi', 'Không thể lưu thuốc.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{editingId ? '✏️ Chỉnh sửa thuốc' : '➕ Thêm thuốc mới'}</Text>

        {/* Ảnh thuốc */}
        <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
          {image && typeof image === 'string' ? (
            <Image source={{ uri: image }} style={styles.image} />
          ) : (
            <Text style={{ color: '#777', textAlign: 'center' }}>📸 Chọn ảnh hoặc nhập URL công khai</Text>
          )}
        </TouchableOpacity>

        {/* Các input */}
        <Text style={styles.label}>Tên thuốc (*)</Text>
        <TextInput value={ten} onChangeText={setTen} style={styles.input} placeholder="Nhập tên thuốc" />

        <Text style={styles.label}>Mã hàng (SKU/Barcode) (Tùy chọn)</Text>
        <TextInput 
            value={maHang} 
            onChangeText={setMaHang} 
            style={styles.input} 
            placeholder="Mã SKU, Mã Barcode (Ví dụ: T001)" 
        />
        
        {/* SỐ ĐĂNG KÝ */}
        <Text style={styles.label}>Số đăng ký (Tùy chọn)</Text>
        <TextInput 
            value={soDangKy} 
            onChangeText={setSoDangKy} 
            style={styles.input} 
            placeholder="Nhập số đăng ký thuốc (VD: VN-20000-16)" 
        />
        
        {/* NHÀ SẢN XUẤT */}
        <Text style={styles.label}>Nhà sản xuất (Tùy chọn)</Text>
        <TextInput 
            value={nhaSanXuat} 
            onChangeText={setNhaSanXuat} 
            style={styles.input} 
            placeholder="Nhập tên nhà sản xuất (VD: Pfizer)" 
        />

        {/* Giá vốn và Giá bán LỚN */}
        <View style={styles.row}>
            <View style={styles.col}>
                <Text style={styles.label}>Giá vốn (VNĐ) (Theo Đơn vị LỚN) (*)</Text>
                <TextInput
                    value={giaVon}
                    onChangeText={setGiaVon}
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="Giá nhập vào (của đơn vị LỚN)"
                />
            </View>
            <View style={styles.col}>
                <Text style={styles.label}>Giá bán (VNĐ) (Theo Đơn vị LỚN) (*)</Text>
                <TextInput
                    value={giaBan}
                    onChangeText={setGiaBan}
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="Giá bán ra (của đơn vị LỚN)"
                />
            </View>
        </View>

        {/* GIÁ BÁN LẺ (ĐƠN VỊ NHỎ) - Tự động tính */}
        <Text style={styles.label}>Giá bán lẻ (VNĐ) (Theo Đơn vị NHỎ: {donViQuyDoiList.find(u => u.ten === donViTinh)?.donViNho || '...'})</Text>
        <TextInput
            value={giaBanLe}
            style={[styles.input, styles.readOnly]} // 🔒 Hiển thị và khóa
            editable={false}
            placeholder="Tự động tính toán (Giá bán / Hệ số quy đổi)"
        />

        {/* SỐ LƯỢNG - Cập nhật nhãn để hiển thị Đơn vị LỚN đang chọn */}
        <Text style={styles.label}>Số lượng (Đơn vị LỚN: {donViTinh || '...'}) (*)</Text>
        <TextInput
          value={soluong}
          onChangeText={setSoLuong}
          style={styles.input}
          keyboardType="numeric"
          placeholder={`Nhập số lượng theo ${donViTinh || 'Đơn vị LỚN'}`}
        />

        <Text style={styles.label}>Hạn sử dụng (*)</Text>
        <TextInput
          value={hanSuDung}
          onChangeText={setHanSuDung}
          style={styles.input}
          placeholder="VD: 2025-12-31"
        />

        <Text style={styles.label}>Đơn vị tính (LỚN - Nhập kho) (*)</Text>
        <Picker
          selectedValue={donViTinh}
          onValueChange={value => setDonViTinh(String(value))}
          style={styles.input}
          enabled={donViQuyDoiList.length > 0}
        >
          <Picker.Item label="-- Chọn đơn vị (LỚN) --" value="" />
          {donViQuyDoiList.map(item => (
            <Picker.Item
              key={item.ten}
              label={`${item.ten} (1 = ${item.heSoQuyDoi} ${item.donViNho})`}
              value={item.ten}
            />
          ))}
        </Picker>

        <Text style={styles.label}>Xuất xứ (Tùy chọn)</Text>
        <Picker selectedValue={xuatXu} onValueChange={setXuatXu} style={styles.input}>
          <Picker.Item label="-- Chọn xuất xứ --" value="" />
          {xuatXuList.map(item => (
            <Picker.Item key={item} label={item} value={item} />
          ))}
        </Picker>

        <Text style={styles.label}>Danh mục (*)</Text>
        <Picker selectedValue={danhMuc} onValueChange={setDanhMuc} style={styles.input}>
          <Picker.Item label="-- Chọn danh mục --" value="" />
          {danhMucList.map(item => (
            <Picker.Item key={item} label={item} value={item} />
          ))}
        </Picker>

        <Text style={styles.label}>Mô tả thuốc (Tùy chọn)</Text>
        <TextInput
          value={moTa}
          onChangeText={setMoTa}
          style={[styles.input, styles.textArea]}
          placeholder="Mô tả chi tiết..."
          multiline
        />

        <Text style={styles.label}>Ghi chú (Tùy chọn)</Text>
        <TextInput
          value={ghiChu}
          onChangeText={setGhiChu}
          style={[styles.input, styles.textArea]}
          placeholder="Ghi chú nội bộ (tùy chọn)"
          multiline
        />

        {/* QR code */}
        {qrValue ? (
          <View style={styles.qrContainer}>
            <Text style={{ fontWeight: '600', marginBottom: 8 }}>📦 Mã QR thuốc</Text>
            <QRCode value={qrValue} size={150} />
            <Text style={{ marginTop: 5, fontSize: 12, color: '#555' }}>Dữ liệu: {qrValue}</Text>
          </View>
        ) : null}

        <View style={{ marginTop: 20 }}>
          {loading ? (
            <ActivityIndicator size="large" color="#0088ff" />
          ) : (
            <Button title="💾 Lưu thuốc" onPress={handleSave} />
          )}
        </View>

        {/* Modal nhập URL ảnh */}
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalBg}>
            <View style={styles.modalBox}>
              <Text style={{ fontWeight: '600', marginBottom: 10 }}>🔗 Nhập URL ảnh công khai</Text>
              <TextInput
                style={styles.input}
                placeholder="https://example.com/image.jpg"
                value={tempUrl}
                onChangeText={setTempUrl}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                <Button
                  title="Hủy"
                  onPress={() => {
                    setTempUrl('');
                    setModalVisible(false);
                  }}
                />
                <Button
                  title="OK"
                  onPress={() => {
                    if (tempUrl.trim().startsWith('http')) {
                      setImage(tempUrl.trim());
                      setTempUrl('');
                      setModalVisible(false);
                    } else {
                      Alert.alert('Lỗi', 'URL không hợp lệ!');
                    }
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
  title: { fontSize: 20, marginBottom: 20, fontWeight: 'bold', textAlign: 'center' },
  label: { fontWeight: '600', marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginTop: 5,
    borderRadius: 6,
  },
  readOnly: { // Style cho trường chỉ đọc
    backgroundColor: '#f0f0f0',
    color: '#333',
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  imageContainer: {
    alignSelf: 'center',
    width: 150,
    height: 150,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  image: { width: 150, height: 150, borderRadius: 10 },
  qrContainer: { alignItems: 'center', marginTop: 20 },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: { backgroundColor: '#fff', padding: 20, borderRadius: 8, width: '80%' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { width: '48%' },
});