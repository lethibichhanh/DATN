// ✅ ChiTietThuoc.tsx – Màn hình chi tiết thuốc (Hoàn chỉnh cho Đồ án Tốt nghiệp)

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import QRCode from 'react-native-qrcode-svg';
import { format } from 'date-fns';

// --- Kiểu dữ liệu
import type { RootStackParamList, Thuoc } from '../../types';

const DEFAULT_IMAGE_URL = 'https://via.placeholder.com/250?text=Khong+Co+Anh';

type Props = NativeStackScreenProps<RootStackParamList, 'ChiTietThuoc'>;

// Component hiển thị chi tiết (Dùng chung)
const DetailItem = ({ label, value }: { label: string; value: string | number }) => (
  <View style={styles.detailItem}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

export default function ChiTietThuoc({ route }: Props) {
  const { thuoc } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(false);

  // Ép kiểu sang 'any' để truy cập các trường mở rộng như donVi, donViNho
  const thuocData = thuoc as any; 
  const imageUri =
    thuocData.imageUrl && thuocData.imageUrl.startsWith('http')
      ? thuocData.imageUrl
      : DEFAULT_IMAGE_URL;

  // ✅ LOGIC: Hàm xử lý hạn sử dụng an toàn cho mọi loại dữ liệu
  const getFormattedHSD = (value: any): string => {
    if (!value) return 'Chưa cập nhật';
    try {
      let dateObj: Date | null = null;

      if (typeof value === 'string') {
        const parts = value.includes('/')
          ? value.split('/')
          : value.includes('-')
          ? value.split('-')
          : [];
          
        if (parts.length === 3) {
          let day: number, month: number, year: number;
          if (value.includes('/')) {
            // dạng "dd/MM/yyyy"
            [day, month, year] = parts.map(Number);
          } else {
            // dạng "yyyy-MM-dd"
            [year, month, day] = parts.map(Number);
          }
          dateObj = new Date(year, month - 1, day);
        } else {
          // Thử Parse trực tiếp nếu không phải định dạng phổ biến
          dateObj = new Date(value);
        }
      } else if (value?.toDate) {
        // Firestore Timestamp
        dateObj = value.toDate();
      } else if (value instanceof Date) {
        dateObj = value;
      }

      // Kiểm tra tính hợp lệ của ngày tháng
      if (!dateObj || isNaN(dateObj.getTime())) return 'Không hợp lệ';
      return format(dateObj, 'dd/MM/yyyy');
    } catch (e) {
      return 'Không hợp lệ';
    }
  };

  const formattedDate = getFormattedHSD(thuoc.hanSuDung);
  
  // ✅ LOGIC: Phân biệt đơn vị lớn và đơn vị bán lẻ
  const donViLon = thuocData.donVi || thuoc.donViTinh || 'Chưa cập nhật'; // DonVi là đơn vị lớn mới, fallback về donViTinh cũ
  const donViBanLe = thuocData.donViNho || thuoc.donViTinh || 'đơn vị'; // DonViNho là đơn vị bán lẻ, fallback về donViTinh cũ
  const soLuongText = `${(thuoc.soluong || 0).toLocaleString()} ${donViBanLe}`; // Số lượng tồn kho theo đơn vị bán lẻ

  // --- CHỨC NĂNG: Chỉnh sửa ---
  const handleEdit = () => {
    if (thuoc.id) {
      // Chuyển sang màn hình thêm/sửa (ThemThuoc), truyền ID để load dữ liệu chỉnh sửa
      navigation.navigate('ThemThuoc', { id: thuoc.id });
    } else {
      Alert.alert('Lỗi', 'Không tìm thấy ID thuốc để chỉnh sửa.');
    }
  };

  // --- CHỨC NĂNG: Xóa thuốc ---
  const handleDelete = () => {
    Alert.alert('🗑️ Xác nhận xóa', `Bạn có chắc muốn xoá thuốc "${thuoc.ten}"?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            if (!thuoc.id) throw new Error('ID thuốc không tồn tại.');
            // Thực hiện xóa tài liệu trên Firestore
            await deleteDoc(doc(db, 'thuocs', thuoc.id));
            Alert.alert('✅ Thành công', 'Đã xóa thuốc khỏi hệ thống.');
            navigation.goBack(); // Quay lại màn hình trước
          } catch (error: any) {
            console.error('Lỗi khi xóa thuốc:', error);
            Alert.alert('Lỗi', `Không thể xóa thuốc: ${error.message}`);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Overlay Loading (Tính năng hoàn chỉnh) */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Đang xử lý...</Text>
        </View>
      )}

      <Text style={styles.title}>💊 Thông tin chi tiết thuốc</Text>

      {/* Ảnh thuốc */}
      <Image source={{ uri: imageUri }} style={styles.image} />

      {/* Thông tin chi tiết */}
      <View style={styles.detailBox}>
        <DetailItem label="🧪 Tên thuốc" value={thuoc.ten || 'Không có'} />
        <DetailItem label="📝 Danh mục" value={thuoc.danhMuc || 'Chưa phân loại'} />
        <DetailItem label="🌍 Xuất xứ" value={thuoc.xuatXu || 'Không rõ'} />
        
        <View style={styles.separatorThin} />

        <DetailItem label="📦 Số lượng tồn" value={soLuongText} />
        {/* Đơn vị lớn (Đơn vị nhập hàng/Đóng gói) */}
        <DetailItem 
          label="📦 Đơn vị lớn " 
          value={donViLon} 
        />
        {/* Đơn vị bán lẻ (Đơn vị bán ra) */}
        <DetailItem 
          label="💊 Đơn vị bán lẻ (Viên/Vỉ)" 
          value={donViBanLe} 
        />
        
        <View style={styles.separatorThin} />

        <DetailItem label="📅 Hạn sử dụng" value={formattedDate} />
        <DetailItem
          label="💰 Giá bán"
          value={
            thuoc.giaBan
              ? `${thuoc.giaBan.toLocaleString('vi-VN')} VNĐ`
              : 'Chưa cập nhật'
          }
        />
        <DetailItem label="✏️ Ghi chú" value={thuoc.ghiChu || 'Không có'} />
      </View>

      {/* Mã QR */}
      {thuocData.qrValue ? (
        <View style={styles.qrContainer}>
          <Text style={styles.qrLabel}>📦 Mã QR thuốc</Text>
          <QRCode value={thuocData.qrValue} size={150} />
        </View>
      ) : (
        <Text style={styles.noQr}>Không có mã QR</Text>
      )}

      {/* Nút chức năng (Chỉnh sửa & Xóa) */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.edit]} 
          onPress={handleEdit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>✏️ Chỉnh sửa</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.delete]} 
          onPress={handleDelete}
          disabled={loading}
        >
          <Text style={styles.buttonText}>🗑️ Xoá</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// 💅 Style (Đảm bảo tính thẩm mỹ và dễ đọc)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 20, paddingBottom: 60 },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  image: {
    width: 220,
    height: 220,
    borderRadius: 12,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 25,
    backgroundColor: '#f9f9f9',
  },
  detailBox: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 20,
  },
  // Đường phân cách mỏng giúp cấu trúc dữ liệu rõ ràng hơn
  separatorThin: { 
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 5,
  },
  detailItem: { marginBottom: 15 },
  label: { fontWeight: '600', fontSize: 14, color: '#666' },
  value: {
    fontSize: 16,
    color: '#000',
    paddingLeft: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007bff',
  },
  qrContainer: { alignItems: 'center', marginTop: 10, marginBottom: 20 },
  qrLabel: { fontWeight: '600', fontSize: 15, marginBottom: 10 },
  noQr: { textAlign: 'center', color: '#999', marginBottom: 20 },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 15,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  edit: { backgroundColor: '#007bff' },
  delete: { backgroundColor: '#dc3545' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.7)',
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { marginTop: 10, color: '#007bff', fontWeight: '600' },
});