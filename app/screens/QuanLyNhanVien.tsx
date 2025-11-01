import { Ionicons } from "@expo/vector-icons";
import { collection, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { db } from "../../firebaseConfig";
import type { User } from "../../types"; // 👈 lấy từ types.ts

export default function QuanLyNhanVienScreen({ navigation }: any) {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      const data = snapshot.docs.map((d) => d.data() as User);
      setUsers(data);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (uid: string) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa nhân viên này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          await deleteDoc(doc(db, "users", uid));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>👥 Quản lý nhân viên</Text>

      {/* Nút thêm nhân viên */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => navigation.navigate("DangKyNhanVien")}
      >
        <Ionicons name="person-add" size={20} color="#fff" />
        <Text style={{ color: "#fff", marginLeft: 6 }}>Thêm nhân viên</Text>
      </TouchableOpacity>

      <FlatList
        data={users}
        keyExtractor={(item) => item.uid}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View>
              <Text style={styles.name}>{item.name} ({item.role})</Text>
              <Text style={styles.email}>{item.email}</Text>
            </View>
            <View style={{ flexDirection: "row" }}>
              {/* Nút chỉnh sửa */}
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: "orange" }]}
                onPress={() => navigation.navigate("DangKyNhanVien", { editUser: item })}
              >
                <Ionicons name="create-outline" size={18} color="#fff" />
              </TouchableOpacity>

              {/* Nút xoá */}
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: "red" }]}
                onPress={() => handleDelete(item.uid)}
              >
                <Ionicons name="trash-outline" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4a90e2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  item: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { fontWeight: "600", fontSize: 16 },
  email: { color: "#555" },
  btn: { padding: 8, borderRadius: 6, marginLeft: 6 },
});
