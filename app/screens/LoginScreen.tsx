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
  Image,
} from "react-native";
// Cập nhật: Thêm sendPasswordResetEmail
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"; 
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../types";
import { Ionicons } from "@expo/vector-icons";

// --- KHÔNG ĐỔI LOGIC ---

export default function LoginScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

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
        let errorMessage = "Đăng nhập thất bại. Vui lòng kiểm tra lại Email và Mật khẩu.";
        if (error.code === 'auth/invalid-email' || error.code === 'auth/user-not-found') {
            errorMessage = "Email không tồn tại hoặc không hợp lệ.";
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = "Mật khẩu không chính xác.";
        } else {
            errorMessage = "Đã xảy ra lỗi không xác định. Vui lòng thử lại.";
        }
        Alert.alert("❌ Lỗi Đăng nhập", errorMessage);
    } finally {
        setIsLoading(false);
    }
  };

  /**
   * Chức năng gửi email đặt lại mật khẩu
   */
  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Lỗi", "Vui lòng nhập **Email** của bạn vào ô trên để nhận liên kết đặt lại mật khẩu.");
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "Thành công 🎉",
        `Đã gửi liên kết đặt lại mật khẩu đến Email: ${email}. Vui lòng kiểm tra hộp thư đến (cả mục Spam/Junk) và làm theo hướng dẫn.`,
        [{ text: "Đóng" }]
      );
    } catch (error: any) {
      let errorMessage = "Không thể gửi Email đặt lại mật khẩu. Vui lòng kiểm tra lại địa chỉ Email.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
        errorMessage = "Không tìm thấy tài khoản người dùng với Email này.";
      }
      Alert.alert("❌ Lỗi Gửi Email", errorMessage);
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
                {/* 🌟 Thêm Logo Image 🌟 */}
                <Image 
                    source={require('../../assets/images/logo.png')} // **CẬP NHẬT ĐƯỜNG DẪN NÀY**
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.brandTitle}>Hệ Thống Quản Lý</Text>
                <Text style={styles.subtitle}>Chào mừng trở lại, Phúc Hạnh!</Text>
            </View>

            <View style={styles.form}>
                
                {/* Input Email */}
                <View style={styles.inputGroup}>
                    <Ionicons name="mail-outline" size={20} color={COLOR_ACCENT} style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Địa chỉ Email"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor="#a0a0a0"
                        editable={!isLoading}
                    />
                </View>
                
                {/* Input Mật khẩu có nút toggle */}
                <View style={styles.inputGroup}>
                    <Ionicons name="lock-closed-outline" size={20} color={COLOR_ACCENT} style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Mật khẩu"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!isPasswordVisible} 
                        placeholderTextColor="#a0a0a0"
                        editable={!isLoading}
                    />
                    {/* Nút Hiện/Ẩn mật khẩu */}
                    <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} disabled={isLoading} style={styles.toggleBtn}>
                        <Ionicons 
                            name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} 
                            size={20} 
                            color="#999" 
                        />
                    </TouchableOpacity>
                </View>

                {/* 🔑 Nút Quên mật khẩu MỚI 🔑 */}
                <TouchableOpacity onPress={handleForgotPassword} disabled={isLoading} style={styles.forgotPasswordContainer}>
                    <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
                </TouchableOpacity>

                {/* Nút Đăng nhập */}
                <TouchableOpacity 
                    style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]} 
                    onPress={handleLogin}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={styles.loginText}>ĐĂNG NHẬP</Text>
                    )}
                </TouchableOpacity>

                {/* Nút chuyển sang Đăng ký */}
                <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
                    <Text style={styles.link}>Chưa có tài khoản? <Text style={styles.linkBold}>Đăng ký ngay</Text></Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    </KeyboardAvoidingView>
  );
}

// --- CẬP NHẬT STYLES V3: SOFT UI / NEUMORPHISM NHẸ ---

const BG_COLOR = "#f0f4f8";           // Màu nền trắng kem (Soft Background)
const COLOR_PRIMARY_GREEN = "#4d924d"; // Xanh lá đậm (Nút/Chủ đạo)
const COLOR_ACCENT = "#5c9eff";        // Xanh dương tươi (Icon/Điểm nhấn)

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG_COLOR }, 
    scrollContent: { 
        flexGrow: 1, 
        padding: 30, 
        justifyContent: "center" 
    },
    header: { alignItems: "center", marginBottom: 50 },
    logo: {
        width: 220, 
        height: 220, 
        marginBottom: 5,
    },
    brandTitle: { 
        fontSize: 30, 
        fontWeight: "900", 
        color: COLOR_PRIMARY_GREEN, 
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 16,
        color: "#666",
        marginTop: 5,
        fontWeight: '500',
    },
    form: { width: "100%", marginTop: 20 },
    
    // --- Input Styles (Soft UI) ---
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: BG_COLOR,
        borderRadius: 15,
        marginBottom: 25,
        paddingHorizontal: 15,
        // Neumorphism/Soft UI Effect
        shadowColor: '#a9c0d3', // Darker shadow
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
        elevation: 8,
        
        borderWidth: 1,
        borderColor: '#ffffff', // Lighter shadow color
    },
    icon: { marginRight: 15 },
    toggleBtn: { padding: 5 }, 
    input: {
        flex: 1,
        fontSize: 17, 
        color: '#333',
        height: 50,
        // Dùng padding để tạo không gian bên trong
        paddingVertical: 10, 
    },

    // --- Forgot Password Link Style ---
    forgotPasswordContainer: {
        alignSelf: 'flex-end',
        marginTop: -15, // Kéo lên gần input
        marginBottom: 25,
    },
    forgotPasswordText: {
        color: COLOR_ACCENT, // Màu xanh dương tươi
        fontWeight: '600',
        fontSize: 15,
        paddingVertical: 5, // Tăng vùng chạm
        paddingHorizontal: 5,
    },

    // --- Button Styles (Elevated) ---
    loginBtn: {
        backgroundColor: COLOR_PRIMARY_GREEN, // Nền Xanh Lá
        padding: 20,
        borderRadius: 15, // Bo góc đồng bộ với input
        alignItems: "center",
        marginBottom: 20,
        marginTop: 10, // Giảm margin top vì đã có forgot password
        // Shadow rõ nét hơn
        shadowColor: COLOR_PRIMARY_GREEN,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 20,
    },
    loginBtnDisabled: {
        backgroundColor: "#9e9e9e", 
        shadowOpacity: 0.1,
        elevation: 5,
    },
    loginText: { 
        color: "#fff", 
        fontWeight: "bold", 
        fontSize: 19,
        letterSpacing: 1,
    },
    link: { 
        color: "#888", 
        textAlign: "center", 
        marginTop: 10,
        fontSize: 15,
    },
    linkBold: {
        color: COLOR_ACCENT, // Màu link nổi bật
        fontWeight: '700',
    }
});