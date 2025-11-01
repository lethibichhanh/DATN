import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../firebaseConfig';

export default function KhoThuocScreen() {
  const [thuocs, setThuocs] = useState<any[]>([]);
  const navigation = useNavigation<any>();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'thuocs'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setThuocs(data);
    });

    return () => unsub(); // cleanup
  }, []);

  const xoaThuoc = async (id: string) => {
    Alert.alert('Xác nhận', 'Bạn có chắc chắn muốn xóa thuốc này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          await deleteDoc(doc(db, 'thuocs', id));
        },
      },
    ]);
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <Text style={styles.name}>{item.ten}</Text>
      {/* ✅ ĐÃ SỬA LỖI: Bọc item.soluong trong thẻ <Text> */}
      <Text style={styles.detailText}>Số lượng: {item.soluong}</Text> 
      <Text style={styles.detailText}>Hạn sử dụng: {item.hanSuDung}</Text>

      <View style={styles.actions}>
        <TouchableOpacity onPress={() => navigation.navigate('ThemThuoc', { id: item.id })}>
          <Ionicons name="create-outline" size={24} color="#4a90e2" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => xoaThuoc(item.id)}>
          <Ionicons name="trash-outline" size={24} color="red" style={{ marginLeft: 16 }} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📦 Danh sách thuốc</Text>

      <FlatList
        data={thuocs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={{ textAlign: 'center' }}>Chưa có thuốc</Text>}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('ThemThuoc')}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, marginBottom: 16, textAlign: 'center', fontWeight: 'bold' },
  card: {
    backgroundColor: '#f4f4f4',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  name: { fontSize: 18, fontWeight: 'bold' },
  // Thêm style cho detailText để áp dụng cho Số lượng và Hạn sử dụng
  detailText: {
    fontSize: 16, // Có thể điều chỉnh kích thước tùy ý
    marginBottom: 4, 
  },
  actions: {
    flexDirection: 'row',
    marginTop: 10,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#4a90e2',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
});