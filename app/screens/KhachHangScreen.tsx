// ✅ KhachHangScreen.tsx – Màn hình Quản lý Khách hàng (FULL CRUD & Logic cho Đồ án Tốt nghiệp)

import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  orderBy,
  serverTimestamp,
  where,
} from 'firebase/firestore';
// Lưu ý: Đảm bảo đường dẫn này đúng trong môi trường của bạn
import { db } from '../../firebaseConfig'; 

// --- Định nghĩa Kiểu dữ liệu Khách hàng ---
interface KhachHang {
  id: string;
  ten: string; // Tên khách hàng (BẮT BUỘC)
  sdt: string; // Số điện thoại (Key chính, BẮT BUỘC)
  diaChi: string; // Địa chỉ
  email: string;
  ngaySinh: string; // Định dạng 'dd/MM/yyyy'
  tongTienMua: number; // Tổng tiền đã mua (Dữ liệu quan trọng cho đồ án CRM)
  ngayTao: any; // Timestamp
}

const CUSTOMER_COLLECTION = 'khachhangs'; // Tên collection trong Firestore

export default function KhachHangScreen() {
  const [customers, setCustomers] = useState<KhachHang[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<KhachHang[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Trạng thái cho Form Input
  const [ten, setTen] = useState('');
  const [sdt, setSdt] = useState('');
  const [diaChi, setDiaChi] = useState('');
  const [email, setEmail] = useState('');
  const [ngaySinh, setNgaySinh] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Trạng thái tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ LOGIC 1: Lắng nghe dữ liệu khách hàng theo thời gian thực (READ)
  useEffect(() => {
    // Tạo Query: Sắp xếp theo tên khách hàng để dễ quản lý
    const q = query(
      collection(db, CUSTOMER_COLLECTION),
      orderBy('ten', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const customerList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Chuyển đổi Timestamp thành Date nếu cần thiết, nhưng ở đây chỉ cần đảm bảo có id
      })) as KhachHang[];
      
      setCustomers(customerList);
      setLoading(false);
    }, (error) => {
      console.error("Lỗi khi fetch khách hàng:", error);
      Alert.alert('Lỗi', 'Không thể tải danh sách khách hàng. Vui lòng kiểm tra kết nối.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ✅ LOGIC 2: Xử lý tìm kiếm/lọc dữ liệu
  useEffect(() => {
    const lowercasedSearch = searchTerm.toLowerCase();
    const filtered = customers.filter(kh => 
      kh.ten.toLowerCase().includes(lowercasedSearch) ||
      kh.sdt.includes(lowercasedSearch) ||
      kh.diaChi.toLowerCase().includes(lowercasedSearch)
    );
    setFilteredCustomers(filtered);
  }, [searchTerm, customers]); // Chạy lại khi customers hoặc searchTerm thay đổi

  // Hàm Reset Form
  const resetForm = () => {
    setTen('');
    setSdt('');
    setDiaChi('');
    setEmail('');
    setNgaySinh('');
    setEditingId(null);
  };

  // ✅ LOGIC 3: Thêm hoặc Cập nhật Khách hàng (CREATE / UPDATE)
  const handleSaveCustomer = async () => {
    if (!ten || !sdt) {
      Alert.alert('Lỗi', 'Tên và Số điện thoại là bắt buộc.');
      return;
    }
    setLoading(true);

    const customerData = {
      ten,
      sdt,
      diaChi,
      email,
      ngaySinh,
      // Đảm bảo tổng tiền mua là số. Nếu đang thêm mới, đặt là 0.
      tongTienMua: editingId ? (customers.find(c => c.id === editingId)?.tongTienMua || 0) : 0, 
      ngayTao: serverTimestamp(),
    };

    try {
      if (editingId) {
        // --- UPDATE ---
        const docRef = doc(db, CUSTOMER_COLLECTION, editingId);
        await updateDoc(docRef, customerData);
        Alert.alert('Thành công', 'Cập nhật khách hàng thành công!');
      } else {
        // --- CREATE ---
        await addDoc(collection(db, CUSTOMER_COLLECTION), customerData);
        Alert.alert('Thành công', 'Thêm khách hàng mới thành công!');
      }
      resetForm();
    } catch (error: any) {
      console.error('Lỗi khi lưu khách hàng:', error);
      Alert.alert('Lỗi', `Không thể lưu khách hàng: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ LOGIC 4: Tải dữ liệu khách hàng vào form chỉnh sửa (EDIT PREPARE)
  const handleEdit = useCallback((customer: KhachHang) => {
    setEditingId(customer.id);
    setTen(customer.ten);
    setSdt(customer.sdt);
    setDiaChi(customer.diaChi);
    setEmail(customer.email);
    setNgaySinh(customer.ngaySinh);
  }, []);

  // ✅ LOGIC 5: Xóa Khách hàng (DELETE)
  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Xác nhận Xóa',
      `Bạn có chắc chắn muốn xóa khách hàng "${name}" không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await deleteDoc(doc(db, CUSTOMER_COLLECTION, id));
              Alert.alert('Thành công', `Đã xóa khách hàng "${name}".`);
            } catch (error: any) {
              console.error('Lỗi khi xóa khách hàng:', error);
              Alert.alert('Lỗi', `Không thể xóa khách hàng: ${error.message}`);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // --- Render Item cho FlatList ---
  const renderItem = ({ item }: { item: KhachHang }) => (
    <View style={styles.item}>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>👤 {item.ten}</Text>
        <Text style={styles.itemDetail}>📞 {item.sdt}</Text>
        <Text style={styles.itemDetail}>🏠 {item.diaChi || 'Chưa cập nhật'}</Text>
        {/* Highlight tổng tiền mua - Rất quan trọng cho đồ án CRM */}
        <Text style={styles.itemTotal}>
          💰 Tổng tiền mua: {item.tongTienMua ? item.tongTienMua.toLocaleString('vi-VN') : 0} VNĐ
        </Text>
      </View>
      
      <View style={styles.itemActions}>
        <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionButton}>
          <Ionicons name="create-outline" size={24} color="#007bff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id, item.ten)} style={styles.actionButton}>
          <Ionicons name="trash-outline" size={24} color="#dc3545" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && customers.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Đang tải dữ liệu khách hàng...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>👥 Quản Lý Khách Hàng</Text>

        {/* --- FORM THÊM/SỬA KHÁCH HÀNG --- */}
        <View style={styles.formContainer}>
          <Text style={styles.subtitle}>
            {editingId ? '✏️ Chỉnh Sửa Khách Hàng' : '➕ Thêm Khách Hàng Mới'}
          </Text>
          
          <TextInput
            style={styles.input}
            placeholder="Tên khách hàng *"
            value={ten}
            onChangeText={setTen}
          />
          <TextInput
            style={styles.input}
            placeholder="Số điện thoại *"
            value={sdt}
            onChangeText={setSdt}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Địa chỉ"
            value={diaChi}
            onChangeText={setDiaChi}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Ngày sinh (dd/MM/yyyy)"
            value={ngaySinh}
            onChangeText={setNgaySinh}
          />

          <TouchableOpacity
            style={[styles.button, editingId ? styles.buttonUpdate : styles.buttonPrimary]}
            onPress={handleSaveCustomer}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{editingId ? 'Cập Nhật' : 'Thêm Khách Hàng'}</Text>
            )}
          </TouchableOpacity>

          {editingId && (
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={resetForm}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Hủy Chỉnh Sửa</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.separator} />

        {/* --- DANH SÁCH KHÁCH HÀNG VÀ TÌM KIẾM --- */}
        <Text style={styles.subtitle}>📋 Danh Sách Khách Hàng ({filteredCustomers.length})</Text>
        
        <TextInput
          style={[styles.input, styles.searchBar]}
          placeholder="🔍 Tìm kiếm theo Tên hoặc SĐT..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />

        {loading && customers.length > 0 ? (
          <View style={styles.listLoading}>
            <ActivityIndicator size="small" color="#007bff" />
          </View>
        ) : filteredCustomers.length === 0 ? (
          <Text style={styles.emptyText}>Không tìm thấy khách hàng nào.</Text>
        ) : (
          <FlatList
            data={filteredCustomers}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false} // Cho phép ScrollView cha cuộn
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// 💅 Style (Styling chuyên nghiệp)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f7' },
  scrollContent: { padding: 20, paddingBottom: 50 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#007bff' },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: 25,
    textAlign: 'center',
    paddingTop: 10,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  formContainer: {
    backgroundColor: '#ffffff',
    padding: 18,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#f8fafc',
    color: '#1a202c',
  },
  searchBar: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderColor: '#007bff',
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonPrimary: { backgroundColor: '#007bff' },
  buttonUpdate: { backgroundColor: '#ffc107' }, // Màu vàng cho nút Cập nhật
  buttonSecondary: { backgroundColor: '#6c757d' }, // Màu xám cho nút Hủy
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#cbd5e0',
    marginVertical: 20,
  },
  // --- List Item Styles ---
  item: {
    flexDirection: 'row',
    padding: 15,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemContent: { flex: 1 },
  itemTitle: {
    fontWeight: '700',
    fontSize: 18,
    color: '#007bff',
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 2,
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#28a745', // Màu xanh lá cho tổng tiền
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 10,
    padding: 8,
    borderRadius: 5,
  },
  emptyText: {
    textAlign: 'center',
    color: '#718096',
    fontSize: 16,
    marginTop: 20,
  },
  listLoading: {
    paddingVertical: 20,
  }
});
