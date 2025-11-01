import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebaseConfig";
import { doc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { RouteProp } from "@react-navigation/native";
import type { RootStackParamList, User } from "../../types";

type Props = {
  navigation: any;
  route: RouteProp<RootStackParamList, "DangKyNhanVien">;
};

export default function DangKyNhanVien({ navigation, route }: Props) {
  const editUser = route.params?.editUser; // 👈 lấy param nếu có
  const [email, setEmail] = useState(editUser?.email || "");
  const [password, setPassword] = useState(""); // chỉ dùng khi thêm mới
  const [name, setName] = useState(editUser?.name || "");
  const [role, setRole] = useState<"admin" | "staff">(editUser?.role || "staff");

  useEffect(() => {
    if (editUser) {
      navigation.setOptions({ title: "Chỉnh sửa nhân viên" });
    }
  }, [editUser]);

  const handleSave = async () => {
    try {
      if (editUser) {
        // 👉 Chỉnh sửa
        const ref = doc(db, "users", editUser.uid);
        await updateDoc(ref, {
          name,
          role,
          email,
        });
        Alert.alert("✅ Thành công", "Cập nhật nhân viên thành công!");
      } else {
        // 👉 Thêm mới
        if (!email || !password) {
          Alert.alert("⚠️ Lỗi", "Vui lòng nhập Email và Mật khẩu!");
          return;
        }
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", res.user.uid), {
          uid: res.user.uid,
          email,
          name,
          role,
          createdAt: serverTimestamp(),
        });
        Alert.alert("✅ Thành công", "Tạo nhân viên mới thành công!");
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("❌ Lỗi", err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {editUser ? "✏️ Chỉnh sửa nhân viên" : "🆕 Thêm nhân viên"}
      </Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        editable={!editUser} // không cho sửa email khi edit
      />

      {!editUser && (
        <TextInput
          placeholder="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />
      )}

      <TextInput
        placeholder="Tên nhân viên"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <TextInput
        placeholder="Vai trò (admin / staff)"
        value={role}
        onChangeText={(text) => setRole(text as "admin" | "staff")}
        style={styles.input}
      />

      <TouchableOpacity style={styles.btn} onPress={handleSave}>
        <Text style={{ color: "#fff" }}>💾 Lưu</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  btn: {
    backgroundColor: "#4a90e2",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
});
