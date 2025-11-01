// app/screens/SignUpScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../types";

export default function SignUpScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff"); // mặc định staff

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ Email và Mật khẩu");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // ✅ lưu thêm role vào Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email,
        role,
      });

      Alert.alert("Thành công", "Tạo tài khoản thành công!");
      navigation.navigate("Login");
    } catch (error: any) {
      Alert.alert("Đăng ký thất bại", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📝 Đăng ký tài khoản</Text>

      <TextInput
        style={styles.input}
        placeholder="📧 Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="🔑 Mật khẩu"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {/* Chọn quyền */}
      <View style={styles.roleContainer}>
        <TouchableOpacity
          style={[styles.roleBtn, role === "admin" && styles.roleActive]}
          onPress={() => setRole("admin")}
        >
          <Text style={styles.roleText}>👑 Admin</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleBtn, role === "staff" && styles.roleActive]}
          onPress={() => setRole("staff")}
        >
          <Text style={styles.roleText}>👷 Nhân viên</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signUpBtn} onPress={handleSignUp}>
        <Text style={styles.signUpText}>Đăng ký</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>⬅️ Đã có tài khoản? Đăng nhập</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  roleContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  roleBtn: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  roleActive: {
    backgroundColor: "#4a90e2",
  },
  roleText: { color: "#000", fontWeight: "600" },
  signUpBtn: {
    backgroundColor: "#28a745",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  signUpText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  link: { color: "#4a90e2", textAlign: "center", marginTop: 10 },
});
