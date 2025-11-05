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

// Hàm định dạng số khi người dùng nhập (ví dụ: 10.000.000)
const formatNumberInput = (text: string): string => {
    // 1. Loại bỏ tất cả ký tự không phải số
    let cleanText = text.replace(/[^0-9]/g, '');
    if (!cleanText) return '';
    
    // 2. Chuyển thành số để format, sau đó quay lại string với dấu chấm ngăn cách hàng nghìn
    const num = parseInt(cleanText, 10);
    // Sử dụng toLocaleString để thêm dấu chấm phân cách hàng nghìn (Việt Nam)
    return num.toLocaleString('vi-VN').replace(/,/g, '.'); 
};


export default function DangKyNhanVien({ navigation, route }: Props) {
  const editUser = route.params?.editUser; // 👈 lấy param nếu có
  const [email, setEmail] = useState(editUser?.email || "");
  const [password, setPassword] = useState(""); // chỉ dùng khi thêm mới
  const [name, setName] = useState(editUser?.name || "");
  const [role, setRole] = useState<"admin" | "staff">(editUser?.role || "staff");
  
  // ⭐ THÊM STATE CHO LƯƠNG
  // Khởi tạo lương: Chuyển lương (number) từ user sang string, có định dạng dấu chấm
  const initialSalary = editUser?.salary ? formatNumberInput(String(editUser.salary)) : "";
  const [salary, setSalary] = useState(initialSalary); 

  useEffect(() => {
    if (editUser) {
      navigation.setOptions({ title: "Chỉnh sửa nhân viên" });
    }
  }, [editUser]);

  const handleSave = async () => {
    // ⭐ Xử lý LƯƠNG: Chuyển chuỗi nhập liệu có dấu chấm thành số (để lưu vào DB)
    const numericSalary = parseFloat(salary.replace(/\./g, ''));
    
    if (isNaN(numericSalary) || numericSalary <= 0) {
        Alert.alert("⚠️ Lỗi", "Lương cố định phải là một số dương hợp lệ.");
        return;
    }
    
    try {
      if (editUser) {
        // 👉 Chỉnh sửa
        const ref = doc(db, "users", editUser.uid);
        await updateDoc(ref, {
          name,
          role,
          email,
          // ⭐ CẬP NHẬT FIELD SALARY
          salary: numericSalary, 
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
          // ⭐ THÊM FIELD SALARY
          salary: numericSalary,
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
      
      {/* ⭐ INPUT LƯƠNG CỐ ĐỊNH */}
      <Text style={styles.label}>Lương Cố Định/Tháng (VNĐ)</Text>
      <TextInput
        placeholder="Ví dụ: 10.000.000"
        keyboardType="numeric"
        value={salary}
        onChangeText={(text) => setSalary(formatNumberInput(text))}
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
  // ⭐ STYLE CHO LABEL
  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#555', 
    marginBottom: 5 
  },
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