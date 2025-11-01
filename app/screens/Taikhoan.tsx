// app/screens/Taikhoan.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { signOut, onAuthStateChanged, updatePassword } from "firebase/auth";
import { auth, db, storage } from "../../firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function TaiKhoanScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // Lấy thông tin user hiện tại
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (snap.exists()) {
          setUser({ uid: currentUser.uid, ...snap.data() });
        } else {
          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            name: currentUser.displayName || "Người dùng",
            role: "staff",
          });
        }
      } else {
        setUser(null);
      }
    });
    return unsub;
  }, []);

  // Đăng xuất
  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: async () => {
          await signOut(auth);
          navigation.replace("Login");
        },
      },
    ]);
  };

  // Đổi mật khẩu
  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert("⚠️ Lỗi", "Mật khẩu mới phải có ít nhất 6 ký tự!");
      return;
    }
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        Alert.alert("✅ Thành công", "Mật khẩu đã được thay đổi!");
        setShowPasswordModal(false);
        setNewPassword("");
      }
    } catch (error: any) {
      Alert.alert("❌ Lỗi", error.message);
    }
  };

  // Đổi ảnh đại diện
  const handleChangeAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      try {
        const uri = result.assets[0].uri;
        const response = await fetch(uri);
        const blob = await response.blob();

        const storageRef = ref(storage, `avatars/${user.uid}.jpg`);
        await uploadBytes(storageRef, blob);

        const downloadURL = await getDownloadURL(storageRef);

        // Cập nhật Firestore
        await updateDoc(doc(db, "users", user.uid), {
          avatar: downloadURL,
        });

        setUser({ ...user, avatar: downloadURL });
        Alert.alert("✅ Thành công", "Ảnh đại diện đã được cập nhật!");
      } catch (err: any) {
        Alert.alert("❌ Lỗi", err.message);
      }
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Đang tải thông tin...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Ảnh đại diện */}
      <TouchableOpacity onPress={handleChangeAvatar}>
        <Image
          source={{
            uri:
              user.avatar ||
              "https://cdn-icons-png.flaticon.com/512/149/149071.png",
          }}
          style={styles.avatar}
        />
        <Text style={{ textAlign: "center", color: "#4a90e2" }}>
          📷 Đổi ảnh đại diện
        </Text>
      </TouchableOpacity>

      {/* Thông tin cá nhân */}
      <Text style={styles.name}>{user.name}</Text>
      <Text style={styles.info}>📧 {user.email}</Text>
      <Text style={styles.info}>
        🎭 Vai trò: {user.role === "admin" ? "Quản trị viên" : "Nhân viên"}
      </Text>

      {/* Nút chức năng */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#4a90e2" }]}
        onPress={() => navigation.navigate("DangKyNhanVien", { editUser: user })}
      >
        <Text style={styles.btnText}>✏️ Cập nhật thông tin</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#f5a623" }]}
        onPress={() => setShowPasswordModal(true)}
      >
        <Text style={styles.btnText}>🔑 Đổi mật khẩu</Text>
      </TouchableOpacity>

      {user.role === "admin" && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#50e3c2" }]}
          onPress={() => navigation.navigate("NhanVien")}
        >
          <Text style={styles.btnText}>👥 Quản lý nhân viên</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "red" }]}
        onPress={handleLogout}
      >
        <Text style={styles.btnText}>🚪 Đăng xuất</Text>
      </TouchableOpacity>

      {/* Modal đổi mật khẩu */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={{ fontWeight: "bold", marginBottom: 10 }}>
              🔑 Đổi mật khẩu
            </Text>
            <TextInput
              placeholder="Nhập mật khẩu mới"
              secureTextEntry
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TouchableOpacity
              style={[styles.button, { backgroundColor: "green", width: "100%" }]}
              onPress={handleChangePassword}
            >
              <Text style={styles.btnText}>Lưu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: "gray", width: "100%" }]}
              onPress={() => setShowPasswordModal(false)}
            >
              <Text style={styles.btnText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", paddingTop: 40, backgroundColor: "#fff" },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 8 },
  name: { fontSize: 22, fontWeight: "bold", marginBottom: 4 },
  info: { fontSize: 16, color: "#555", marginBottom: 4 },
  button: {
    padding: 12,
    borderRadius: 8,
    marginTop: 14,
    width: "70%",
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    width: "100%",
    marginBottom: 12,
  },
});
