// ChiTietKhachHangScreen.tsx – Màn hình Chi tiết, Thêm/Sửa Khách hàng (FULL CRM)

import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
  query,
  where,
  getDocs, // Dùng để lấy lịch sử hóa đơn
} from 'firebase/firestore';
import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../../firebaseConfig'; 
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

// --- Định nghĩa Kiểu dữ liệu Khách hàng ---
interface KhachHang {
  id: string;
  ten: string; 
  sdt: string; 
  diaChi: string; 
  email: string;
  ngaySinh: string; 
  tongTienMua: number; 
  ngayTao: any; 
}

const initialCustomerData: Omit<KhachHang, 'id' | 'ngayTao'> = {
  ten: '',
  sdt: '',
  diaChi: '',
  email: '',
  ngaySinh: '',
  tongTienMua: 0,
};

// Kiểu dữ liệu giả định cho Hóa đơn
interface HoaDon {
    id: string;
    ngayTao: any;
    tongTien: number;
    trangThai: string;
}

const CUSTOMER_COLLECTION = 'khachhangs'; 
const HOADON_COLLECTION = 'hoadons'; // Cần đồng bộ với collection Hóa đơn của bạn

// Giả định RootStackParamList
type RootStackParamList = {
    KhachHang: undefined;
    ChiTietKhachHang: { customerId: string }; // ID là 'NEW' hoặc ID thật
};
type Props = NativeStackScreenProps<RootStackParamList, 'ChiTietKhachHang'>;

// Component hiển thị chi tiết (View Mode)
const DetailItem = ({ label, value, iconName }: { label: string; value: string | number; iconName: keyof typeof Ionicons.glyphMap }) => (
  <View style={styles.detailItem}>
    <Text style={styles.label}>
      <Ionicons name={iconName} size={16} color="#4a90e2" /> {label}
    </Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);


export default function ChiTietKhachHangScreen() {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation();
  const { customerId } = route.params;

  const [customerData, setCustomerData] = useState<KhachHang | Omit<KhachHang, 'id' | 'ngayTao'>>(initialCustomerData);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(customerId === 'NEW'); // Mặc định chỉnh sửa nếu là Thêm mới
  const [history, setHistory] = useState<HoaDon[]>([]);
  
  const isNew = customerId === 'NEW';
  
  // 1. FETCH DỮ LIỆU KHÁCH HÀNG & LỊCH SỬ GIAO DỊCH
  const fetchData = useCallback(async () => {
    if (isNew) {
        setCustomerData(initialCustomerData);
        setIsEditing(true); // Luôn ở chế độ thêm mới
        navigation.setOptions({ title: '➕ Thêm Khách Hàng Mới' });
        return;
    }

    setLoading(true);
    try {
        // Fetch chi tiết khách hàng
        const docRef = doc(db, CUSTOMER_COLLECTION, customerId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            const customer: KhachHang = {
                id: docSnap.id,
                ten: data.ten || '',
                sdt: data.sdt || '',
                diaChi: data.diaChi || '',
                email: data.email || '',
                ngaySinh: data.ngaySinh || '',
                tongTienMua: data.tongTienMua || 0,
                ngayTao: data.ngayTao,
            };
            setCustomerData(customer);
            navigation.setOptions({ title: `Chi Tiết: ${customer.ten}` });

            // Fetch Lịch sử giao dịch (CRM quan trọng)
            const historyQuery = query(
                collection(db, HOADON_COLLECTION),
                where('sdtKhachHang', '==', customer.sdt), // Giả định trường SĐT KH là 'sdtKhachHang'
                // Thêm orderBy('ngayTao', 'desc') nếu cần
            );
            const historySnapshot = await getDocs(historyQuery);
            const historyList: HoaDon[] = historySnapshot.docs.map(doc => ({
                id: doc.id,
                tongTien: doc.data().tongTien || 0,
                ngayTao: doc.data().ngayTao,
                trangThai: doc.data().trangThai || 'Hoàn thành',
            })) as HoaDon[];
            setHistory(historyList);

        } else {
            Alert.alert('Lỗi', 'Không tìm thấy khách hàng này.');
            navigation.goBack();
        }
    } catch (error) {
        console.error('Lỗi fetch chi tiết KH:', error);
        Alert.alert('Lỗi', 'Không thể tải dữ liệu chi tiết khách hàng.');
    } finally {
        setLoading(false);
    }
  }, [customerId, isNew, navigation]);

  // Dùng useFocusEffect để fetch lại khi màn hình được focus (sau khi update thành công)
  useFocusEffect(useCallback(() => {
    fetchData();
  }, [fetchData]));


  // 2. LOGIC LƯU (THÊM/SỬA)
  const handleSaveCustomer = async () => {
    const { ten, sdt, diaChi } = customerData;

    if (!ten || !sdt || !diaChi) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ Tên, Số điện thoại và Địa chỉ.');
      return;
    }
    
    // Kiểm tra định dạng số điện thoại
    const phoneRegex = /^\d{10,11}$/; 
    if (!phoneRegex.test(sdt)) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ (cần 10-11 chữ số).');
      return;
    }

    setIsSaving(true);
    try {
      // Dữ liệu chung để lưu
      const dataToSave: Omit<KhachHang, 'id' | 'ngayTao'> = {
        ten,
        sdt,
        diaChi,
        email: customerData.email || '',
        ngaySinh: customerData.ngaySinh || '',
        tongTienMua: customerData.tongTienMua || 0,
      };

      if (isNew) {
        // Thêm mới
        await addDoc(collection(db, CUSTOMER_COLLECTION), {
          ...dataToSave,
          ngayTao: serverTimestamp(), 
        });
        Alert.alert('Thành công', `Thêm khách hàng ${ten} thành công!`);
        navigation.goBack(); // Quay lại danh sách
      } else {
        // Cập nhật
        const docRef = doc(db, CUSTOMER_COLLECTION, customerId);
        await updateDoc(docRef, dataToSave);
        Alert.alert('Thành công', `Cập nhật khách hàng ${ten} thành công!`);
        setIsEditing(false); // Chuyển về chế độ xem sau khi lưu
        // Tự động fetch lại dữ liệu mới nhất
        fetchData(); 
      }

    } catch (error) {
      console.error('Lỗi lưu khách hàng:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi lưu dữ liệu. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Rendering Modes ---
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Đang tải dữ liệu chi tiết...</Text>
      </View>
    );
  }

  // Chế độ THÊM MỚI / CHỈNH SỬA
  if (isEditing) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#f5f5f5' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={styles.formContainer}>
          <Text style={styles.sectionTitle}>{isNew ? 'Nhập thông tin khách hàng' : 'Thông tin chỉnh sửa'}</Text>
            
          <Text style={styles.label}>Tên Khách Hàng (*)</Text>
          <TextInput
            style={styles.input}
            placeholder="Nguyễn Văn A"
            value={customerData.ten}
            onChangeText={(text) => setCustomerData({ ...customerData, ten: text })}
          />

          <Text style={styles.label}>Số Điện Thoại (*)</Text>
          <TextInput
            style={styles.input}
            placeholder="09xx.xxx.xxx"
            keyboardType="phone-pad"
            value={customerData.sdt}
            onChangeText={(text) => setCustomerData({ ...customerData, sdt: text.replace(/[^0-9]/g, '') })}
            maxLength={11}
          />

          <Text style={styles.label}>Địa Chỉ (*)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Số nhà, đường, Quận/Huyện, Tỉnh/Thành phố..."
            value={customerData.diaChi}
            onChangeText={(text) => setCustomerData({ ...customerData, diaChi: text })}
            multiline
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="abc@example.com"
            value={customerData.email}
            onChangeText={(text) => setCustomerData({ ...customerData, email: text })}
            keyboardType="email-address"
          />

          <Text style={styles.label}>Ngày Sinh (dd/MM/yyyy)</Text>
          <TextInput
            style={styles.input}
            placeholder="01/01/1990"
            value={customerData.ngaySinh}
            onChangeText={(text) => setCustomerData({ ...customerData, ngaySinh: text })}
          />

          {/* Hiển thị chỉ số CRM (chỉ cho xem, không cho sửa) */}
          {!isNew && (
            <>
              <Text style={styles.label}>Tổng Tiền Mua</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={`${customerData.tongTienMua.toLocaleString()} VNĐ`}
                editable={false}
              />
            </>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => isNew ? navigation.goBack() : setIsEditing(false)}
                disabled={isSaving}
            >
                <Text style={styles.buttonText}>Hủy</Text>
            </TouchableOpacity>
            
            {isSaving ? (
                <View style={[styles.button, styles.buttonPrimary, { justifyContent: 'center' }]}>
                    <ActivityIndicator color="#fff" />
                </View>
            ) : (
                <TouchableOpacity
                    style={[styles.button, styles.buttonPrimary]}
                    onPress={handleSaveCustomer}
                >
                    <Text style={styles.buttonText}>{isNew ? 'THÊM KHÁCH HÀNG' : 'LƯU THAY ĐỔI'}</Text>
                </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Chế độ XEM CHI TIẾT
  const kh = customerData as KhachHang; // Ép kiểu an toàn
  const ngayTaoFormatted = kh.ngayTao?.toDate ? format(kh.ngayTao.toDate(), 'HH:mm dd/MM/yyyy', { locale: vi }) : "N/A";

  return (
    <ScrollView style={styles.container}>
      
      {/* KHỐI NÚT HÀNH ĐỘNG */}
      <View style={styles.actionHeader}>
          <TouchableOpacity 
              style={[styles.actionButton, styles.buttonUpdate]}
              onPress={() => setIsEditing(true)} // Bật chế độ chỉnh sửa
          >
              <Ionicons name="create-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Chỉnh Sửa</Text>
          </TouchableOpacity>
          {/* Nút Xóa được chuyển về màn hình danh sách */}
      </View>
      
      <Text style={styles.detailTitle}>{kh.ten}</Text>
      <Text style={styles.detailSubTitle}>Mã KH: {kh.id}</Text>

      {/* KHỐI THÔNG TIN CƠ BẢN */}
      <View style={styles.detailBox}>
        <Text style={styles.sectionTitle}>Thông tin Cơ bản</Text>
        <DetailItem label="Số Điện Thoại" value={kh.sdt} iconName="call-outline" />
        <DetailItem label="Địa Chỉ" value={kh.diaChi} iconName="home-outline" />
        {kh.email && <DetailItem label="Email" value={kh.email} iconName="mail-outline" />}
        {kh.ngaySinh && <DetailItem label="Ngày Sinh" value={kh.ngaySinh} iconName="calendar-outline" />}
      </View>

      {/* KHỐI CHỈ SỐ CRM */}
      <View style={styles.detailBox}>
        <Text style={styles.sectionTitle}>Chỉ số Khách hàng (CRM)</Text>
        <DetailItem 
          label="Tổng Tiền Đã Mua" 
          value={`${kh.tongTienMua.toLocaleString()} VNĐ`} 
          iconName="wallet-outline" 
        />
        <DetailItem 
          label="Ngày Tạo Hồ Sơ" 
          value={ngayTaoFormatted} 
          iconName="time-outline" 
        />
      </View>
      
      {/* KHỐI LỊCH SỬ GIAO DỊCH (CRM quan trọng cho đồ án) */}
      <View style={styles.detailBox}>
        <Text style={styles.sectionTitle}>Lịch sử Giao dịch ({history.length} hóa đơn)</Text>
        {history.length > 0 ? (
            history.map((hd, index) => {
                const hdDate = hd.ngayTao?.toDate ? format(hd.ngayTao.toDate(), 'dd/MM/yyyy', { locale: vi }) : "N/A";
                return (
                    <View style={styles.historyItem} key={hd.id}>
                        <Text style={styles.historyText}>#HD{hd.id.slice(0, 6).toUpperCase()} ({hdDate})</Text>
                        <Text style={[styles.historyAmount, { color: hd.trangThai === 'Đã hủy' ? '#dc3545' : '#28a745' }]}>
                            {hd.tongTien.toLocaleString()} VNĐ
                        </Text>
                    </View>
                );
            })
        ) : (
            <Text style={styles.noHistoryText}>Khách hàng này chưa có giao dịch nào.</Text>
        )}
      </View>

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // --- General ---
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 15 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  detailTitle: { fontSize: 24, fontWeight: 'bold', color: '#4a90e2', marginBottom: 5, textAlign: 'center' },
  detailSubTitle: { fontSize: 14, color: '#999', marginBottom: 20, textAlign: 'center' },
  
  // --- Detail View ---
  detailBox: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 5,
    borderLeftColor: '#4a90e2',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
  detailItem: { marginBottom: 12 },
  label: { fontWeight: '600', fontSize: 14, color: '#666' },
  value: { fontSize: 16, color: '#000', marginTop: 3, paddingLeft: 10 },

  // Lịch sử giao dịch
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  historyText: { fontSize: 14, color: '#333' },
  historyAmount: { fontSize: 14, fontWeight: 'bold' }, // Màu được xác định trong code
  noHistoryText: { textAlign: 'center', color: '#999', marginTop: 10, fontStyle: 'italic' },


  // Header hành động
  actionHeader: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginBottom: 20 },
  actionButton: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      paddingVertical: 8, 
      paddingHorizontal: 12, 
      borderRadius: 8 
  },
  actionButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 5 },
  buttonUpdate: { backgroundColor: '#ffc107' }, // Màu vàng cho Chỉnh sửa
  
  // --- Edit/Add Form ---
  formContainer: { padding: 20, flexGrow: 1, backgroundColor: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginTop: 5,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  inputDisabled: {
    backgroundColor: '#eee',
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: { backgroundColor: '#4CAF50' },
  buttonSecondary: { backgroundColor: '#6c757d' },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});