import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, Alert
} from 'react-native';
import {
  collection, addDoc, onSnapshot,
  updateDoc, deleteDoc, doc
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

type DanhMucType = {
  id: string;
  ten: string;
};

export default function DanhMucScreen() {
  const [danhMucs, setDanhMucs] = useState<DanhMucType[]>([]);
  const [tenMoi, setTenMoi] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'danhmucs'), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DanhMucType[];
      setDanhMucs(data);
    });
    return () => unsubscribe();
  }, []);

  const handleAddOrUpdate = async () => {
    if (!tenMoi.trim()) {
      Alert.alert('⚠️ Vui lòng nhập tên danh mục');
      return;
    }

    try {
      if (editId) {
        await updateDoc(doc(db, 'danhmucs', editId), { ten: tenMoi.trim() });
        setEditId(null);
      } else {
        await addDoc(collection(db, 'danhmucs'), { ten: tenMoi.trim() });
      }
      setTenMoi('');
    } catch (error) {
      Alert.alert('❌ Lỗi', 'Không thể xử lý');
    }
  };

  const handleEdit = (item: DanhMucType) => {
    setTenMoi(item.ten);
    setEditId(item.id);
  };

  const handleDelete = (id: string) => {
    Alert.alert('❗ Xác nhận', 'Bạn có chắc muốn xoá danh mục này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'danhmucs', id));
            if (editId === id) {
              setEditId(null);
              setTenMoi('');
            }
          } catch {
            Alert.alert('❌ Lỗi', 'Không thể xoá danh mục');
          }
        },
      },
    ]);
  };

  const handleOpenDanhMuc = (item: DanhMucType) => {
    navigation.navigate('ThuocTheoDanhMuc', { danhMuc: item.ten });
  };

  const renderItem = ({ item }: { item: DanhMucType }) => (
    <View style={styles.item}>
      {/* Bấm vào text để mở danh mục */}
      <TouchableOpacity style={{ flex: 1 }} onPress={() => handleOpenDanhMuc(item)}>
        <Text style={styles.itemText}>📂 {item.ten}</Text>
      </TouchableOpacity>

      {/* Action buttons */}
      <View style={styles.itemActions}>
        <TouchableOpacity onPress={() => handleEdit(item)}>
          <Text style={styles.actionText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)}>
          <Text style={styles.actionText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📁 Quản lý Danh mục thuốc</Text>

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Nhập tên danh mục..."
          value={tenMoi}
          onChangeText={setTenMoi}
          style={styles.input}
        />
        <TouchableOpacity style={styles.button} onPress={handleAddOrUpdate}>
          <Text style={styles.buttonText}>{editId ? '💾 Lưu' : '➕ Thêm'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={danhMucs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>Chưa có danh mục nào</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'center', color: '#333' },
  inputContainer: { flexDirection: 'row', marginBottom: 16 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', paddingHorizontal: 12, borderRadius: 8 },
  button: { marginLeft: 8, backgroundColor: '#4a90e2', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  item: { flexDirection: 'row', backgroundColor: '#f0f4f8', padding: 12, borderRadius: 8, marginBottom: 10, alignItems: 'center' },
  itemText: { fontSize: 16 },
  itemActions: { flexDirection: 'row', gap: 12 },
  actionText: { fontSize: 18, marginLeft: 8 },
  empty: { textAlign: 'center', color: '#999', marginTop: 20 },
});
