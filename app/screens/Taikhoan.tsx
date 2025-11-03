// app/screens/Taikhoan.tsx
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  onAuthStateChanged,
  signOut,
  updatePassword,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db, storage } from "../../firebaseConfig";

// Component con cho các nút chức năng
const ActionButton = ({ title, icon, color, onPress, disabled = false }: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) => (
  <TouchableOpacity
    style={[styles.button, { backgroundColor: color, opacity: disabled ? 0.6 : 1 }]}
    onPress={onPress}
    disabled={disabled}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Ionicons name={icon} size={20} color="#fff" />
      <Text style={styles.btnText}>{title}</Text>
    </View>
  </TouchableOpacity>
);


export default function TaiKhoanScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false); 

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
    if (!newPassword || newPassword.length < 8) {
      Alert.alert("⚠️ Lỗi", "Mật khẩu mới phải có ít nhất 8 ký tự!");
      return;
    }
    
    setIsLoading(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        Alert.alert("✅ Thành công", "Mật khẩu đã được thay đổi!");
        setShowPasswordModal(false);
        setNewPassword("");
      }
    } catch (error: any) {
      console.error("Lỗi đổi mật khẩu:", error.code);
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert(
          "❌ Lỗi Bảo mật", 
          "Để đổi mật khẩu, bạn cần đăng nhập lại. Vui lòng đăng xuất và đăng nhập lại ngay lập tức rồi thử đổi mật khẩu."
        );
      } else {
        Alert.alert("❌ Lỗi", error.message);
      }
    } finally {
        setIsLoading(false);
    }
  };

  // Đổi ảnh đại diện
  const handleChangeAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert("Lỗi", "Cần có quyền truy cập thư viện ảnh để đổi ảnh đại diện.");
        return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], 
      quality: 0.7,
    });

    if (!result.canceled) {
      setIsLoading(true);
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
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={{ marginTop: 10 }}>Đang tải thông tin...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Ảnh đại diện */}
      <TouchableOpacity onPress={handleChangeAvatar} disabled={isLoading}>
        <Image
          source={{
            uri:
              user.avatar ||
              "https://cdn-icons-png.flaticon.com/512/149/149071.png",
          }}
          style={styles.avatar}
        />
        <Text style={{ textAlign: "center", color: isLoading ? "#999" : "#4a90e2" }}>
          {isLoading ? "Đang tải..." : "📷 Đổi ảnh đại diện"}
        </Text>
      </TouchableOpacity>

      {/* Thông tin cá nhân */}
      <Text style={styles.name}>{user.name}</Text>
      <Text style={styles.info}>📧 {user.email}</Text>
      <Text style={styles.info}>
        🎭 Vai trò: **{user.role === "admin" ? "Quản trị viên" : "Nhân viên"}**
      </Text>

      {/* Nút chức năng */}
      <ActionButton
        title="Cập nhật thông tin"
        icon="create-outline"
        color="#4a90e2"
        onPress={() => navigation.navigate("DangKyNhanVien", { editUser: user })}
      />

      <ActionButton
        title="Đổi mật khẩu"
        icon="key-outline"
        color="#f5a623"
        onPress={() => setShowPasswordModal(true)}
      />

      {user.role === "admin" && (
        <ActionButton
          title="Quản lý Nhân viên"
          icon="people-outline"
          color="#50e3c2"
          onPress={() => navigation.navigate("NhanVien")}
        />
        // ❌ ĐÃ LOẠI BỎ: Nút "Quản lý Khách hàng"
      )}

      <ActionButton
        title="Đăng xuất"
        icon="log-out-outline"
        color="red"
        onPress={handleLogout}
      />

      {/* Modal đổi mật khẩu */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={{ fontWeight: "bold", marginBottom: 15, fontSize: 18 }}>
              🔑 Đổi mật khẩu
            </Text>
            <TextInput
              placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
              secureTextEntry
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
            />
            {isLoading ? (
              <ActivityIndicator size="small" color="green" style={{ marginBottom: 10 }} />
            ) : (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: "green", width: "100%", marginTop: 0 }]}
                onPress={handleChangePassword}
              >
                <Text style={styles.btnText}>Lưu mật khẩu</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.button, { backgroundColor: "gray", width: "100%" }]}
              onPress={() => {
                setShowPasswordModal(false);
                setNewPassword("");
              }}
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
  container: { flex: 1, alignItems: "center", paddingTop: 40, backgroundColor: "#f9f9f9" },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 8, borderWidth: 2, borderColor: '#ccc' },
  name: { fontSize: 24, fontWeight: "bold", marginBottom: 4, color: '#333' },
  info: { fontSize: 16, color: "#555", marginBottom: 6 },
  button: {
    padding: 12,
    borderRadius: 8,
    marginTop: 14,
    width: "70%",
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16, marginLeft: 8 },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    width: "100%",
    marginBottom: 15,
    fontSize: 16,
  },
});