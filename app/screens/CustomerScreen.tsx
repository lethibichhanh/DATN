// KhachHangScreen.tsx – Màn hình Danh sách Khách hàng (List & Search)

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
// ✅ IMPORT NativeStackNavigationProp & RootStackParamList TỪ FILE CHUNG
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, KhachHang } from '../../types'; // ✅ Đảm bảo đường dẫn này đúng

// Lưu ý: Đảm bảo đường dẫn này đúng trong môi trường của bạn
import { db } from '../../firebaseConfig';

// --- Khách hàng Interface (Không cần định nghĩa lại nếu đã có trong types.ts, nhưng giữ lại để đảm bảo) ---
/*
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
*/

const CUSTOMER_COLLECTION = 'khachhangs';

// ✅ SỬ DỤNG KIỂU CHUNG ĐÃ IMPORT TỪ types.ts
// LƯU Ý: Đã đổi 'RootStackParamList, 'KhachHang'>' thành 'RootStackParamList' 
// vì 'KhachHang' là một màn hình nằm trong RootStackParamList
type NavigationProp = NativeStackNavigationProp<RootStackParamList>; 

export default function KhachHangScreen() {
  const [customers, setCustomers] = useState<KhachHang[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<KhachHang[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  // ✅ SỬ DỤNG NavigationProp MỚI
  const navigation = useNavigation<NavigationProp>(); 

  // ✅ LOGIC 1: Lắng nghe dữ liệu khách hàng theo thời gian thực (READ)
  useEffect(() => {
    // Tạo Query: Sắp xếp theo tên khách hàng
    const q = query(
      collection(db, CUSTOMER_COLLECTION),
      orderBy('ten', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const customerList = snapshot.docs.map(doc => ({
        id: doc.id,
        // Đảm bảo dữ liệu số không bị undefined
        tongTienMua: doc.data().tongTienMua || 0,
        ...doc.data(),
      })) as KhachHang[];
      
      setCustomers(customerList);
      setLoading(false);
    }, (error) => {
      console.error("Lỗi khi fetch khách hàng:", error);
      Alert.alert('Lỗi', 'Không thể tải danh sách khách hàng.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ✅ LOGIC 2: Xử lý tìm kiếm/lọc dữ liệu
  useEffect(() => {
    const lowercasedSearch = searchTerm.toLowerCase();
    const filtered = customers.filter(kh => 
      (kh.ten && kh.ten.toLowerCase().includes(lowercasedSearch)) ||
      (kh.sdt && kh.sdt.includes(lowercasedSearch))
    );
    setFilteredCustomers(filtered);
  }, [searchTerm, customers]);

  // ✅ LOGIC 3: Chuyển sang màn hình Chi tiết (VIEW/EDIT)
  const handleViewDetail = (customerId: string) => {
    // Gọi màn hình ChiTietKhachHang, truyền customerId
    navigation.navigate('ChiTietKhachHang', { customerId }); 
  };
  
  // ✅ LOGIC 4: Chuyển sang màn hình Thêm mới (ADD)
  const handleAddNew = () => {
    // Gọi màn hình ChiTietKhachHang, truyền ID đặc biệt 'NEW'
    navigation.navigate('ChiTietKhachHang', { customerId: 'NEW' }); 
  };

  // ✅ LOGIC 5: Xóa Khách hàng (DELETE)
  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Xác nhận Xóa',
      `Bạn có chắc chắn muốn xóa khách hàng "${name}"?`,
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
    <TouchableOpacity 
      style={styles.item}
      onPress={() => handleViewDetail(item.id)} // Bấm vào để xem chi tiết
    >
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
        <TouchableOpacity onPress={() => handleViewDetail(item.id)} style={styles.actionButton}>
          <Ionicons name="chevron-forward-outline" size={24} color="#007bff" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={(e) => {
            e.stopPropagation(); // Ngăn chặn sự kiện onPress của thẻ cha
            handleDelete(item.id, item.ten);
          }} 
          style={styles.actionButton}
        >
          <Ionicons name="trash-outline" size={24} color="#dc3545" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>👥 Quản Lý Khách Hàng </Text>

      {/* --- HEADER CHỨC NĂNG --- */}
      <View style={styles.header}>
        <TextInput
          style={styles.searchBar}
          placeholder="🔍 Tìm kiếm theo Tên hoặc SĐT..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddNew}
          disabled={loading}
        >
          <Ionicons name="person-add-outline" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Thêm</Text>
        </TouchableOpacity>
      </View>

      {/* --- DANH SÁCH KHÁCH HÀNG --- */}
      {loading && customers.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Đang tải dữ liệu khách hàng...</Text>
        </View>
      ) : filteredCustomers.length === 0 ? (
        <Text style={styles.emptyText}>
          {searchTerm ? 'Không tìm thấy khách hàng nào.' : 'Chưa có khách hàng nào trong hệ thống.'}
        </Text>
      ) : (
        <FlatList
          data={filteredCustomers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

// 💅 Style (Styling chuyên nghiệp)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f7', padding: 10 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#007bff' },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: 20,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  addButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  // --- List Item Styles ---
  item: {
    flexDirection: 'row',
    padding: 15,
    marginVertical: 6,
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
    marginLeft: 5,
    padding: 5,
    borderRadius: 5,
  },
  emptyText: {
    textAlign: 'center',
    color: '#718096',
    fontSize: 16,
    marginTop: 20,
    fontStyle: 'italic',
  },
});