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

export default function ThemThuocScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editingId = route.params?.id;

  // State chính
  const [ten, setTen] = useState('');
  const [soluong, setSoLuong] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  const [moTa, setMoTa] = useState('');
  const [hanSuDung, setHanSuDung] = useState('');
  const [giaBan, setGiaBan] = useState('');
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

  // --- Load dữ liệu thuốc khi chỉnh sửa ---
  useEffect(() => {
    if (editingId) {
      const fetchData = async () => {
        const docRef = doc(db, 'thuocs', editingId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setTen(data.ten || '');
          setSoLuong(data.soluong?.toString() || '');
          setHanSuDung(data.hanSuDung || '');
          setGiaBan(data.giaBan?.toString() || '');
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

  // --- Chọn ảnh ---
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

  // --- Lưu thuốc ---
  const handleSave = async () => {
    if (!ten.trim() || !soluong || !hanSuDung || !giaBan || !donViTinh || !danhMuc) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin bắt buộc.');
      return;
    }

    const selectedUnit = donViQuyDoiList.find(unit => unit.ten === donViTinh);
    if (!selectedUnit) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin đơn vị tính.');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = image;
      if (imageUrl && imageUrl.startsWith('file://')) imageUrl = '';

      const qrData = `${ten}_${selectedUnit.donViNho}_${Date.now()}`;
      setQrValue(qrData);

      const thuocData = {
        ten,
        soluong: parseInt(soluong),
        hanSuDung,
        giaBan: parseFloat(giaBan),
        donViTinh: selectedUnit.ten,
        donViNho: selectedUnit.donViNho,
        heSoQuyDoi: selectedUnit.heSoQuyDoi,
        xuatXu,
        danhMuc,
        ghiChu: ghiChu || '',
        moTa: moTa || '',
        imageUrl: imageUrl || '',
        qrValue: qrData,
        ngayTao: new Date(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'thuocs', editingId), thuocData);
        Alert.alert('✅ Thành công', 'Đã cập nhật thuốc');
      } else {
        await addDoc(collection(db, 'thuocs'), thuocData);
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
        <Text style={styles.label}>Tên thuốc</Text>
        <TextInput value={ten} onChangeText={setTen} style={styles.input} placeholder="Nhập tên thuốc" />

        <Text style={styles.label}>Số lượng (đơn vị LỚN)</Text>
        <TextInput
          value={soluong}
          onChangeText={setSoLuong}
          style={styles.input}
          keyboardType="numeric"
          placeholder="Nhập số lượng"
        />

        <Text style={styles.label}>Giá bán (VNĐ)</Text>
        <TextInput
          value={giaBan}
          onChangeText={setGiaBan}
          style={styles.input}
          keyboardType="numeric"
          placeholder="VD: 50000"
        />

        <Text style={styles.label}>Hạn sử dụng</Text>
        <TextInput
          value={hanSuDung}
          onChangeText={setHanSuDung}
          style={styles.input}
          placeholder="VD: 2025-12-31"
        />

        <Text style={styles.label}>Đơn vị tính (LỚN - Nhập kho)</Text>
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

        <Text style={styles.label}>Xuất xứ</Text>
        <Picker selectedValue={xuatXu} onValueChange={setXuatXu} style={styles.input}>
          <Picker.Item label="-- Chọn xuất xứ --" value="" />
          {xuatXuList.map(item => (
            <Picker.Item key={item} label={item} value={item} />
          ))}
        </Picker>

        <Text style={styles.label}>Danh mục</Text>
        <Picker selectedValue={danhMuc} onValueChange={setDanhMuc} style={styles.input}>
          <Picker.Item label="-- Chọn danh mục --" value="" />
          {danhMucList.map(item => (
            <Picker.Item key={item} label={item} value={item} />
          ))}
        </Picker>

        <Text style={styles.label}>Mô tả thuốc</Text>
        <TextInput
          value={moTa}
          onChangeText={setMoTa}
          style={[styles.input, styles.textArea]}
          placeholder="Mô tả chi tiết..."
          multiline
        />

        <Text style={styles.label}>Ghi chú</Text>
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
                      setModalVisible(false); // ✅ Tự đóng modal
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
});
