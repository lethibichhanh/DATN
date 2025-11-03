// app/screens/LoginScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../types";
import { Ionicons } from "@expo/vector-icons"; // Import icon cho giao diện

export default function LoginScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false); // State cho Hiện/Ẩn mật khẩu

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ Email và Mật khẩu");
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const uid = userCredential.user.uid;
      const userDoc = await getDoc(doc(db, "users", uid));

      if (userDoc.exists()) {
        const { role } = userDoc.data();
        
        // Điều hướng sau khi đăng nhập thành công
        if (role === "admin") {
          navigation.reset({
            index: 0,
            routes: [{ name: "AdminTabs" }],
          });
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: "StaffTabs" }],
          });
        }
      } else {
        Alert.alert("Lỗi", "Không tìm thấy thông tin quyền người dùng.");
      }
    } catch (error: any) {
        // Xử lý lỗi Firebase Auth với thông báo thân thiện
        let errorMessage = "Đăng nhập thất bại. Vui lòng kiểm tra lại Email và Mật khẩu.";
        if (error.code === 'auth/invalid-email' || error.code === 'auth/user-not-found') {
            errorMessage = "Email không tồn tại hoặc không hợp lệ.";
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = "Mật khẩu không chính xác.";
        } else {
            errorMessage = error.message;
        }
        Alert.alert("❌ Lỗi Đăng nhập", errorMessage);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
    >
        <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
                <Ionicons name="medkit-outline" size={48} color="#2ecc71" />
                <Text style={styles.brandTitle}> NHÀ THUỐC PHÚC HẠNH</Text>
                <Text style={styles.subtitle}>Đăng nhập vào hệ thống</Text>
            </View>

            <View style={styles.form}>
                {/* Input Email */}
                <View style={styles.inputGroup}>
                    <Ionicons name="mail-outline" size={20} color="#777" style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor="#999"
                        editable={!isLoading}
                    />
                </View>
                
                {/* Input Mật khẩu có nút toggle */}
                <View style={styles.inputGroup}>
                    <Ionicons name="lock-closed-outline" size={20} color="#777" style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Mật khẩu"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!isPasswordVisible} // Ẩn/Hiện mật khẩu
                        placeholderTextColor="#999"
                        editable={!isLoading}
                    />
                    {/* Nút Hiện/Ẩn mật khẩu */}
                    <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} disabled={isLoading}>
                        <Ionicons 
                            name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} 
                            size={20} 
                            color="#777" 
                            style={styles.toggleIcon}
                        />
                    </TouchableOpacity>
                </View>

                {/* Nút Đăng nhập */}
                <TouchableOpacity 
                    style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]} 
                    onPress={handleLogin}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={styles.loginText}>Đăng nhập</Text>
                    )}
                </TouchableOpacity>

                {/* Nút chuyển sang Đăng ký */}
                <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
                    <Text style={styles.link}>🆕 Chưa có tài khoản? Đăng ký ngay</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f7f7f7" },
    scrollContent: { 
        flexGrow: 1, 
        padding: 25, 
        justifyContent: "center" // Canh giữa nội dung
    },
    header: { alignItems: "center", marginBottom: 40 },
    brandTitle: { 
        fontSize: 30, 
        fontWeight: "900", 
        color: "#2ecc71", // Màu xanh lá cây chủ đạo
        marginTop: 10,
    },
    subtitle: {
        fontSize: 16,
        color: "#777",
        marginTop: 5,
    },
    form: { width: "100%" },
    
    // --- Input Styles ---
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 10,
        marginBottom: 15,
        paddingHorizontal: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    icon: { marginRight: 10 },
    toggleIcon: { paddingLeft: 10 }, // Khoảng cách cho icon toggle
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#333',
    },

    // --- Button Styles ---
    loginBtn: {
        backgroundColor: "#3498db", // Màu xanh dương cho hành động Đăng nhập
        padding: 16,
        borderRadius: 10,
        alignItems: "center",
        marginBottom: 20,
        marginTop: 10,
        shadowColor: "#3498db",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 8,
    },
    loginBtnDisabled: {
        backgroundColor: "#a5cce0", // Màu xám nhạt hơn khi disabled
        elevation: 0,
    },
    loginText: { 
        color: "#fff", 
        fontWeight: "bold", 
        fontSize: 18 
    },
    link: { 
        color: "#4a90e2", 
        textAlign: "center", 
        marginTop: 10,
        fontSize: 14,
        fontWeight: '600'
    },
});