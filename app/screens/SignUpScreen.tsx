// app/screens/SignUpScreen.tsx
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
  ScrollView, // Dùng ScrollView để tránh bị cắt khi bàn phím hiện lên
} from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../types";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from 'expo-clipboard'; 

// --- HÀM TẠO MẬT KHẨU BẢO MẬT CAO (Giữ nguyên) ---
const generateStrongPassword = (): string => {
  const length = 12;
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const number = '0123456789';
  const special = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
  const all = lower + upper + number + special;

  let password = '';
  password += lower[Math.floor(Math.random() * lower.length)];
  password += upper[Math.floor(Math.random() * upper.length)];
  password += number[Math.floor(Math.random() * number.length)];
  password += special[Math.floor(Math.random() * special.length)];

  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

// --- HÀM KIỂM TRA ĐỘ MẠNH MẬT KHẨU TỰ ĐẶT ---
const checkPasswordStrength = (password: string): { strong: boolean; message: string } => {
    if (password.length < 8) {
        return { strong: false, message: "Mật khẩu phải từ 8 ký tự trở lên." };
    }
    let missing = [];
    if (!/[a-z]/.test(password)) missing.push("chữ thường");
    if (!/[A-Z]/.test(password)) missing.push("chữ hoa");
    if (!/[0-9]/.test(password)) missing.push("số");
    if (!/[!@#$%^&*()_+~`|}{[\]:;?><,./-=]/.test(password)) missing.push("ký tự đặc biệt");

    if (missing.length === 0) {
        return { strong: true, message: "Mật khẩu an toàn." };
    }
    return { strong: false, message: `Thiếu: ${missing.join(', ')}.` };
};


export default function SignUpScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff"); 
  const [isLoading, setIsLoading] = useState(false); 
  
  // Trạng thái cho chế độ Tự sinh Mật khẩu
  const [isGeneratedPassword, setIsGeneratedPassword] = useState(false);
  const [isPasswordCopied, setIsPasswordCopied] = useState(false); 
  
  // Trạng thái cho Hiện/Ẩn mật khẩu
  const [isPasswordVisible, setIsPasswordVisible] = useState(false); 

  // Tự sinh và set mật khẩu
  const handleGeneratePassword = () => {
    const newPassword = generateStrongPassword();
    setPassword(newPassword);
    setIsGeneratedPassword(true);
    setIsPasswordCopied(false); 
    setIsPasswordVisible(false); // Ẩn mật khẩu tự sinh
  };

  // Thay đổi mật khẩu thủ công
  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setIsGeneratedPassword(false); // Chuyển về chế độ tự đặt
    setIsPasswordCopied(false); // Reset trạng thái sao chép
  };

  // Xử lý sao chép mật khẩu (Chỉ dùng khi mật khẩu được tự sinh)
  const handleCopyPassword = async () => {
    if (!isGeneratedPassword || !password) {
        Alert.alert("Lỗi", "Chức năng này chỉ áp dụng cho mật khẩu tự sinh.");
        return;
    }
    
    setIsLoading(true);
    try {
        await Clipboard.setStringAsync(password);
        setIsPasswordCopied(true);
        Alert.alert("✅ Đã sao chép", "Mật khẩu đã được sao chép vào bộ nhớ tạm.");
    } catch (e) {
        Alert.alert("Lỗi", "Không thể sao chép mật khẩu. Vui lòng thử lại.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !name) { 
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ Tên, Email và Mật khẩu.");
      return;
    }

    // Kiểm tra ràng buộc bảo mật cho mật khẩu tự đặt
    if (!isGeneratedPassword) {
        const strength = checkPasswordStrength(password);
        if (!strength.strong) {
            Alert.alert("❌ Mật khẩu yếu", `Mật khẩu bạn tự đặt chưa đủ mạnh: ${strength.message}`);
            return;
        }
    } else if (isGeneratedPassword && !isPasswordCopied) {
        // Kiểm tra ràng buộc bắt buộc sao chép nếu dùng mật khẩu tự sinh
        Alert.alert("Yêu cầu Bảo mật", "Vui lòng sao chép mật khẩu đã được tạo để đảm bảo bạn ghi nhớ nó.");
        return;
    }
    
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await setDoc(doc(db, "users", userCredential.user.uid), {
        email,
        name,
        role,
        avatar: "",
      });

      Alert.alert("✅ Thành công", "Tạo tài khoản thành công! Vui lòng đăng nhập.");
      navigation.navigate("Login");
    } catch (error: any) {
      let errorMessage = "Đăng ký thất bại.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Email này đã được sử dụng bởi tài khoản khác.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Địa chỉ email không hợp lệ.";
      } else {
        errorMessage = error.message;
      }
      Alert.alert("❌ Lỗi Đăng ký", errorMessage);
    } finally {
        setIsLoading(false);
    }
  };

  const passwordStrength = checkPasswordStrength(password);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
        <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
                <Ionicons name="medkit-outline" size={48} color="#2ecc71" />
                <Text style={styles.brandTitle}> NHÀ THUỐC PHÚC HẠNH</Text> 
                <Text style={styles.subtitle}>Tạo tài khoản mới</Text>
            </View>

            <View style={styles.form}>
                {/* Họ tên */}
                <View style={styles.inputGroup}>
                    <Ionicons name="person-outline" size={20} color="#777" style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Họ tên của bạn"
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                {/* Email */}
                <View style={styles.inputGroup}>
                    <Ionicons name="mail-outline" size={20} color="#777" style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>
                
                {/* --- KHU VỰC MẬT KHẨU TỰ CHỌN VÀ TỰ SINH --- */}
                <Text style={styles.roleLabel}>Mật khẩu:</Text>
                
                <View style={styles.inputGroup}>
                    <Ionicons name="lock-closed-outline" size={20} color="#777" style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Mật khẩu (Tối thiểu 8 ký tự, có đủ chữ hoa/thường, số, ký tự đặc biệt)"
                        value={password}
                        onChangeText={handlePasswordChange}
                        secureTextEntry={!isPasswordVisible} // Ẩn/Hiện mật khẩu
                    />
                    {/* Nút Hiện/Ẩn mật khẩu */}
                    <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                        <Ionicons 
                            name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} 
                            size={20} 
                            color="#777" 
                            style={styles.icon}
                        />
                    </TouchableOpacity>
                </View>

                {/* Hiển thị độ mạnh của mật khẩu tự đặt */}
                {!isGeneratedPassword && password.length > 0 && (
                    <Text style={[styles.strengthText, { 
                        color: passwordStrength.strong ? '#2ecc71' : 'red' 
                    }]}>
                        {passwordStrength.strong ? "✅ " : "❌ "}
                        {passwordStrength.message}
                    </Text>
                )}
                
                {/* Khu vực Tự sinh/Sao chép mật khẩu */}
                {!isGeneratedPassword ? (
                    <TouchableOpacity style={styles.generateBtn} onPress={handleGeneratePassword}>
                        <Ionicons name="key-outline" size={20} color="#fff" />
                        <Text style={styles.copyText}>Tự sinh mật khẩu bảo mật cao</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.passwordOutputContainer}>
                        <Text style={styles.passwordGeneratedText}>Mật khẩu đã sinh. Sao chép và đăng nhập!</Text>
                        <TouchableOpacity 
                            style={[styles.copyBtn, isPasswordCopied && styles.copyBtnCopied]} 
                            onPress={handleCopyPassword}
                            disabled={isLoading}
                        >
                            <Ionicons 
                                name={isPasswordCopied ? "checkmark-circle" : "copy-outline"} 
                                size={20} 
                                color="#fff" 
                            />
                            <Text style={styles.copyText}>
                                {isPasswordCopied ? "Đã Sao Chép" : "Sao Chép"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
                
                {isGeneratedPassword && !isPasswordCopied && (
                    <Text style={styles.warningText}>⚠️ Bắt buộc sao chép mật khẩu tự sinh trước khi đăng ký!</Text>
                )}
                {/* --- HẾT KHU VỰC MẬT KHẨU --- */}


                {/* Chọn quyền */}
                <Text style={[styles.roleLabel, { marginTop: 20 }]}>Chọn vai trò:</Text>
                <View style={styles.roleContainer}>
                    <TouchableOpacity
                        style={[styles.roleBtn, role === "admin" && styles.roleActive]}
                        onPress={() => setRole("admin")}
                        disabled={isLoading}
                    >
                        <Ionicons name="shield-half-outline" size={18} color={role === "admin" ? "#fff" : "#34495e"} />
                        <Text style={[styles.roleText, role === "admin" && styles.roleTextActive]}>Admin</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.roleBtn, role === "staff" && styles.roleActive]}
                        onPress={() => setRole("staff")}
                        disabled={isLoading}
                    >
                        <Ionicons name="people-outline" size={18} color={role === "staff" ? "#fff" : "#34495e"} />
                        <Text style={[styles.roleText, role === "staff" && styles.roleTextActive]}>Nhân viên</Text>
                    </TouchableOpacity>
                </View>

                {/* Nút Đăng ký */}
                <TouchableOpacity 
                    style={[
                        styles.signUpBtn, 
                        (isLoading || (!isGeneratedPassword && !passwordStrength.strong) || (isGeneratedPassword && !isPasswordCopied)) && styles.signUpBtnDisabled
                    ]} 
                    onPress={handleSignUp}
                    disabled={isLoading || (!isGeneratedPassword && !passwordStrength.strong) || (isGeneratedPassword && !isPasswordCopied)} 
                >
                    {isLoading ? (
                        <Text style={styles.signUpText}>Đang đăng ký...</Text>
                    ) : (
                        <Text style={styles.signUpText}>Đăng ký ngay</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                    <Text style={styles.link}>⬅️ Đã có tài khoản? Đăng nhập</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f7f7" },
  scrollContent: { flexGrow: 1, padding: 25 }, // Cập nhật để ScrollView hoạt động
  header: { alignItems: "center", marginBottom: 30, marginTop: 40 },
  brandTitle: { 
    fontSize: 28, 
    fontWeight: "900", 
    color: "#2ecc71",
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
  },
  icon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  strengthText: {
      fontSize: 12,
      marginBottom: 15,
      paddingLeft: 5,
  },

  // --- Password Generation Styles ---
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: "#3498db",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
  },
  passwordOutputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    marginBottom: 15,
  },
  passwordGeneratedText: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 15,
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f39c12',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  copyBtnCopied: {
    backgroundColor: '#2ecc71',
  },
  copyText: { 
    color: "#fff", 
    fontWeight: "bold", 
    marginLeft: 5 
  },
  warningText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
    fontWeight: '600'
  },

  // --- Role Styles (Giữ nguyên) ---
  roleLabel: { 
    fontSize: 14, 
    color: "#555", 
    marginBottom: 10, 
    fontWeight: 'bold' 
  },
  roleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#e8e8e8",
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleActive: {
    backgroundColor: "#3498db",
    borderColor: '#2980b9',
  },
  roleText: { color: "#34495e", fontWeight: "600", marginLeft: 5 },
  roleTextActive: { color: "#fff" },

  // --- Button Styles (Đã cập nhật) ---
  signUpBtn: {
    backgroundColor: "#2ecc71",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#2ecc71",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
  },
  signUpBtnDisabled: {
      backgroundColor: "#a5d6a7",
      elevation: 0,
  },
  signUpText: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  link: { color: "#3498db", textAlign: "center", marginTop: 10, fontSize: 14 },
});