import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, TextInput
} from 'react-native';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useRoute, useNavigation } from '@react-navigation/native';

type ThuocType = {
  id: string;
  ten: string;
  soluong: number;
  hanSuDung: string;
};

export default function ThuocTheoDanhMucScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { danhMuc } = route.params;

  const [thuocs, setThuocs] = useState<ThuocType[]>([]);
  const [searchText, setSearchText] = useState('');
  const [sortType, setSortType] = useState<'none' | 'hsdAsc' | 'hsdDesc' | 'slAsc' | 'slDesc'>('none');

  useEffect(() => {
    const q = query(collection(db, 'thuocs'), where('danhMuc', '==', danhMuc));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ThuocType[];
      setThuocs(data);
    });
    return () => unsubscribe();
  }, [danhMuc]);

  const handleDelete = (id: string) => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xoá thuốc này?', [
      { text: 'Huỷ' },
      {
        text: 'Xoá', style: 'destructive', onPress: async () => {
          await deleteDoc(doc(db, 'thuocs', id));
        }
      }
    ]);
  };

  const handleSort = (type: typeof sortType) => {
    setSortType(type);
  };

  const getFilteredData = () => {
    let filtered = thuocs.filter(t =>
      t.ten.toLowerCase().includes(searchText.toLowerCase())
    );

    switch (sortType) {
      case 'hsdAsc':
        return filtered.sort((a, b) => new Date(a.hanSuDung).getTime() - new Date(b.hanSuDung).getTime());
      case 'hsdDesc':
        return filtered.sort((a, b) => new Date(b.hanSuDung).getTime() - new Date(a.hanSuDung).getTime());
      case 'slAsc':
        return filtered.sort((a, b) => a.soluong - b.soluong);
      case 'slDesc':
        return filtered.sort((a, b) => b.soluong - a.soluong);
      default:
        return filtered;
    }
  };

  const renderItem = ({ item }: { item: ThuocType }) => (
    <View style={styles.item}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemText}>{item.ten}</Text>
        <Text style={styles.subText}>SL: {item.soluong} | HSD: {item.hanSuDung}</Text>
      </View>
      <TouchableOpacity onPress={() => navigation.navigate('ThemThuoc', { id: item.id })}>
        <Text style={styles.actionText}>✏️</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleDelete(item.id)}>
        <Text style={styles.actionText}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💊 Thuốc thuộc {danhMuc}</Text>

      {/* Ô tìm kiếm */}
      <TextInput
        placeholder="🔍 Tìm thuốc..."
        value={searchText}
        onChangeText={setSearchText}
        style={styles.searchInput}
      />

      {/* Nút sắp xếp */}
      <View style={styles.sortContainer}>
        <TouchableOpacity style={styles.sortBtn} onPress={() => handleSort('hsdAsc')}>
          <Text>📅 HSD ↑</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sortBtn} onPress={() => handleSort('hsdDesc')}>
          <Text>📅 HSD ↓</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sortBtn} onPress={() => handleSort('slAsc')}>
          <Text>📦 SL ↑</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sortBtn} onPress={() => handleSort('slDesc')}>
          <Text>📦 SL ↓</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sortBtn} onPress={() => handleSort('none')}>
          <Text>♻️ Reset</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={getFilteredData()}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>Không có thuốc nào</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  searchInput: {
    borderWidth: 1, borderColor: '#ccc', paddingHorizontal: 12, borderRadius: 8,
    marginBottom: 10
  },
  sortContainer: { flexDirection: 'row', marginBottom: 10, flexWrap: 'wrap' },
  sortBtn: {
    backgroundColor: '#e0e0e0', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 6, marginRight: 6, marginBottom: 6
  },
  item: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    backgroundColor: '#f0f4f8', borderRadius: 8, marginBottom: 10
  },
  itemText: { fontSize: 16, fontWeight: 'bold' },
  subText: { fontSize: 14, color: '#555' },
  actionText: { fontSize: 18, marginLeft: 12 },
  empty: { textAlign: 'center', color: '#999', marginTop: 20 },
});
