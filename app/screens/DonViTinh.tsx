import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
// Đã xóa import { Picker } vì không còn dùng

import { Ionicons } from '@expo/vector-icons';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig'; // Giữ nguyên import Firebase

// Định nghĩa kiểu dữ liệu (Đã xóa xuatXu)
interface DonViTinh {
  id: string;
  ten: string; // Tên đơn vị lớn (VD: Hộp)
  // 🚫 Đã xóa: xuatXu: string; 
  ngayTao: Date;
  donViNho: string; // Tên đơn vị nhỏ (VD: Viên)
  heSoQuyDoi: number; // Hệ số quy đổi (VD: 100)
}

export default function DonViTinhScreen() {
  const [ten, setTen] = useState('');
  // 🚫 Đã xóa: const [xuatXu, setXuatXu] = useState('');
  // 🚫 Đã xóa: const [xuatXuList, setXuatXuList] = useState<string[]>([]);

  // TRƯỜNG CHO QUY ĐỔI
  const [donViNho, setDonViNho] = useState('');
  const [heSoQuyDoi, setHeSoQuyDoi] = useState<string>(''); 

  const [donViList, setDonViList] = useState<DonViTinh[]>([]);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 🚫 Đã xóa: useEffect để load Danh sách Xuất xứ

  // --- Load Danh sách Đơn vị tính (Giữ nguyên logic load) ---
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'donvitinh'));
    const unsub = onSnapshot(q, (snap) => {
      const data: DonViTinh[] = snap.docs.map((doc) => ({
        id: doc.id,
        ten: doc.data().ten,
        // 🚫 Đã xóa: xuatXu: doc.data().xuatXu, 
        ngayTao: doc.data().ngayTao?.toDate() || new Date(),
        donViNho: doc.data().donViNho || '',
        heSoQuyDoi: doc.data().heSoQuyDoi || 1, 
      }));
      setDonViList(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // --- Thêm / Sửa Đơn vị tính (Cập nhật Validation và Data Object) ---
  const handleSave = async () => {
    const quyDoiNumber = parseInt(heSoQuyDoi, 10);

    // Validation đã loại bỏ Xuất xứ
    if (!ten.trim() || !donViNho.trim() || isNaN(quyDoiNumber) || quyDoiNumber <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ Tên đơn vị LỚN, Tên đơn vị NHỎ và Hệ số quy đổi hợp lệ (> 0).');
      return;
    }

    const existingUnit = donViList.find(i => i.id === editingId);
    
    const data = {
      ten: ten.trim(),
      // 🚫 Đã xóa: xuatXu, 
      donViNho: donViNho.trim(),
      heSoQuyDoi: quyDoiNumber, 
      ngayTao: editingId ? existingUnit?.ngayTao : new Date(), 
      ngayCapNhat: new Date(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'donvitinh', editingId), data);
        Alert.alert('✅ Thành công', 'Đã cập nhật đơn vị.');
      } else {
        await addDoc(collection(db, 'donvitinh'), data);
        Alert.alert('✅ Thành công', 'Đã thêm đơn vị mới.');
      }

      // Reset form
      setTen('');
      // 🚫 Đã xóa: setXuatXu('');
      setDonViNho('');
      setHeSoQuyDoi('');
      setEditingId(null);
    } catch (error) {
      console.error("Lỗi lưu dữ liệu:", error);
      Alert.alert('❌ Lỗi', 'Không thể lưu dữ liệu');
    }
  };

  const handleCancelEdit = () => {
    setTen('');
    // 🚫 Đã xóa: setXuatXu('');
    setDonViNho(''); 
    setHeSoQuyDoi(''); 
    setEditingId(null);
  };

  // --- Chuyển sang chế độ Sửa (Cập nhật load dữ liệu) ---
  const handleEdit = (item: DonViTinh) => {
    setTen(item.ten);
    // 🚫 Đã xóa: setXuatXu(item.xuatXu);
    setDonViNho(item.donViNho);
    setHeSoQuyDoi(item.heSoQuyDoi.toString()); 
    setEditingId(item.id);
  };

  // --- Xóa Đơn vị tính (Giữ nguyên) ---
  const handleDelete = (id: string, name: string) => {
    Alert.alert('Xác nhận xóa', `Bạn có chắc chắn muốn xóa đơn vị "${name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'donvitinh', id));
            Alert.alert('🗑️ Đã xóa', `Đã xóa đơn vị "${name}" thành công.`);
            handleCancelEdit();
          } catch (error) {
            console.error("Lỗi khi xóa:", error);
            Alert.alert('❌ Lỗi', 'Không thể xóa đơn vị này. Có thể có sản phẩm/thuốc đang sử dụng đơn vị này.');
          }
        },
      },
    ]);
  };

  // --- Lọc danh sách (Đã xóa lọc theo Xuất xứ) ---
  const filteredList = donViList.filter((item) =>
    item.ten.toLowerCase().includes(search.toLowerCase()) ||
    item.donViNho.toLowerCase().includes(search.toLowerCase()) 
  );

  // --- Component con cho từng item trong FlatList (Cập nhật hiển thị) ---
  const renderItem = ({ item }: { item: DonViTinh }) => (
    <View style={styles.item}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemText}>{item.ten}</Text>
        {/* 🚫 Đã xóa: Hiển thị Xuất xứ */}
        <Text style={styles.itemSubText}>
            Quy đổi: 1 **{item.ten}** = **{item.heSoQuyDoi}** {item.donViNho}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => handleEdit(item)}
          style={[styles.actionButton, styles.editButton]}
        >
          <Ionicons name="pencil-outline" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDelete(item.id, item.ten)}
          style={[styles.actionButton, styles.deleteButton]}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // --- Header của FlatList (Form & Tìm kiếm - Đã cập nhật form) ---
  const ListHeader = (
    <View style={styles.headerContainer}>
      <Text style={styles.mainTitle}>📦 Quản lý đơn vị tính</Text>

      {/* --- FORM THÊM / SỬA --- */}
      <Text style={styles.listHeaderTitle}>📝 {editingId ? 'Chỉnh sửa' : 'Thêm mới'} đơn vị tính</Text>

      <Text style={styles.label}>Tên đơn vị **LỚN** (Đơn vị nhập kho)</Text>
      <TextInput
        value={ten}
        onChangeText={setTen}
        placeholder="VD: Hộp, Chai, Tuýp..."
        style={styles.input}
      />

      {/* 🚫 Đã xóa: Toàn bộ phần chọn Xuất xứ */}

      <View style={styles.separatorThin} />

      {/* TRƯỜNG QUY ĐỔI ĐƠN VỊ */}
      <Text style={styles.listHeaderTitle}>⚙️ Quy đổi đơn vị (Đơn vị bán lẻ)</Text>

      <Text style={styles.label}>Tên đơn vị **NHỎ** (Đơn vị bán lẻ)</Text>
      <TextInput
        value={donViNho}
        onChangeText={setDonViNho}
        placeholder="VD: Viên, Gói, Lọ, ml..."
        style={styles.input}
      />

      <Text style={styles.label}>Hệ số quy đổi (1 **{ten || '[Đơn vị Lớn]'}** = ? **{donViNho || '[Đơn vị Nhỏ]'}**)</Text>
      <TextInput
        value={heSoQuyDoi}
        onChangeText={setHeSoQuyDoi}
        placeholder="VD: 100"
        style={styles.input}
        keyboardType="numeric" 
      />
      {/* KẾT THÚC TRƯỜNG MỚI */}


      <View style={styles.buttonContainer}>
        <Button
          title={editingId ? '💾 Cập nhật đơn vị' : '➕ Thêm đơn vị'}
          onPress={handleSave}
          color={editingId ? '#FFA500' : '#007bff'}
        />
        {editingId && (
          <View style={{ marginTop: 10 }}>
            <Button
              title="✖️ Hủy chỉnh sửa"
              onPress={handleCancelEdit}
              color="#dc3545"
            />
          </View>
        )}
      </View>

      <View style={styles.separator} />

      {/* --- TÌM KIẾM --- */}
      <Text style={styles.listHeaderTitle}>🔍 Tìm kiếm</Text>
      <TextInput
        placeholder="Nhập từ khóa (tên lớn hoặc tên nhỏ)..." // Đã cập nhật placeholder
        value={search}
        onChangeText={setSearch}
        style={styles.input}
      />

      <Text style={[styles.listHeaderTitle, { marginTop: 20 }]}>
        📋 Danh sách đơn vị tính ({filteredList.length})
      </Text>
      {loading && <ActivityIndicator size="large" color="#007bff" style={{marginTop: 10}} />}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={ListHeader}
        data={filteredList}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.flatListContent}
        ListEmptyComponent={
          loading ? null : ( 
            <Text style={styles.emptyText}>
              Không tìm thấy đơn vị tính nào.
            </Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  flatListContent: {
    padding: 20,
    paddingBottom: 40, 
  },
  headerContainer: {
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  listHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#555',
  },
  label: {
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  // 🚫 Đã xóa style pickerWrapper, picker
  buttonContainer: {
    marginTop: 15,
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 30,
  },
  separatorThin: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 15,
  },
  // --- List Item Styles ---
  item: {
    flexDirection: 'row',
    padding: 15,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  itemText: {
    fontWeight: 'bold',
    fontSize: 17,
    color: '#333',
  },
  itemSubText: {
    fontSize: 14,
    color: '#777',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  actionButton: {
    padding: 8,
    borderRadius: 5,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#007bff', 
  },
  deleteButton: {
    backgroundColor: '#dc3545', 
  },
  emptyText: {
    textAlign: 'center', 
    marginTop: 20, 
    fontSize: 16,
    color: '#888',
  }
});