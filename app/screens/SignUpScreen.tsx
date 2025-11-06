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
    Image,
    ActivityIndicator,
    Dimensions,
} from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../types";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from 'expo-clipboard';

// LƯU Ý QUAN TRỌNG: Đường dẫn hình ảnh phải chính xác so với file thực tế.
// Nếu logo.png không tồn tại ở ../../assets/images/logo.png, ứng dụng sẽ crash.
// Trong trường hợp này, bạn phải đảm bảo tệp tồn tại hoặc thay thế bằng một placeholder an toàn.
const LOGO_SOURCE = require('../../assets/images/logo.png'); 

// --- ĐỊNH NGHĨA MÀU SẮC ĐỒNG BỘ ---
const BG_COLOR = "#f0f4f8";       // Màu nền trắng kem (Soft Background)
const COLOR_PRIMARY_GREEN = "#4d924d"; // Xanh lá đậm (Nút/Chủ đạo)
const COLOR_ACCENT = "#5c9eff";     // Xanh dương tươi (Icon/Điểm nhấn)
const COLOR_COPY = "#f39c12";      // Màu vàng cam cho nút Sao Chép

// --- KHÔNG ĐỔI LOGIC: generateStrongPassword, checkPasswordStrength ---
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
// --- HẾT LOGIC ---


export default function SignUpScreen() {
    const navigation =
        useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState<"admin" | "staff">("staff");
    const [isLoading, setIsLoading] = useState(false);
    
    const [isGeneratedPassword, setIsGeneratedPassword] = useState(false);
    const [isPasswordCopied, setIsPasswordCopied] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const handleGeneratePassword = () => {
        const newPassword = generateStrongPassword();
        setPassword(newPassword);
        setIsGeneratedPassword(true);
        setIsPasswordCopied(false);
        setIsPasswordVisible(false);
    };

    const handlePasswordChange = (text: string) => {
        setPassword(text);
        // Tắt cờ mật khẩu tự sinh nếu người dùng tự thay đổi
        if (isGeneratedPassword) {
             setIsGeneratedPassword(false);
        }
        setIsPasswordCopied(false);
    };

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
            // Log lỗi chi tiết hơn nếu cần
            console.error("Copy to clipboard failed:", e);
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

        if (!isGeneratedPassword) {
            const strength = checkPasswordStrength(password);
            if (!strength.strong) {
                Alert.alert("❌ Mật khẩu yếu", `Mật khẩu bạn tự đặt chưa đủ mạnh: ${strength.message}`);
                return;
            }
        } else if (isGeneratedPassword && !isPasswordCopied) {
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

            // Lưu thông tin người dùng bổ sung vào Firestore
            await setDoc(doc(db, "users", userCredential.user.uid), {
                email,
                name,
                role,
                avatar: "",
                createdAt: new Date().toISOString(), // Thêm thời gian tạo
            });

            Alert.alert("✅ Thành công", "Tạo tài khoản thành công! Vui lòng đăng nhập.");
            navigation.navigate("Login");
        } catch (error: any) {
            let errorMessage = "Đăng ký thất bại.";
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "Email này đã được sử dụng bởi tài khoản khác.";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "Địa chỉ email không hợp lệ.";
            } else if (error.code === 'auth/weak-password') {
                 errorMessage = "Mật khẩu quá yếu. Vui lòng sử dụng mật khẩu mạnh hơn.";
            } else {
                // Log lỗi chi tiết để debug
                console.error("Firebase SignUp Error:", error);
                errorMessage = error.message;
            }
            Alert.alert("❌ Lỗi Đăng ký", errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const passwordStrength = checkPasswordStrength(password);
    
    // Logic tắt nút Đăng ký khi: Đang tải, Mật khẩu tự đặt yếu, hoặc Mật khẩu tự sinh chưa được sao chép
    const isSignUpDisabled = isLoading || (!isGeneratedPassword && !passwordStrength.strong) || (isGeneratedPassword && !isPasswordCopied);

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            {/* THAY THẾ ScrollView BẰNG View VÀ DÙNG justifyContent: "space-between" để cố gắng vừa màn hình */}
            <View style={styles.content}> 
                <View style={styles.header}>
                    <Image
                        // CẦN ĐẢM BẢO TỆP HÌNH ẢNH logo.png TỒN TẠI Ở ĐƯỜNG DẪN NÀY
                        source={LOGO_SOURCE} 
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.brandTitle}>Tạo Tài Khoản Mới</Text>
                    <Text style={styles.subtitle}>Thiết lập thông tin người dùng</Text>
                </View>

                <View style={styles.form}>
                    {/* Họ tên */}
                    <View style={styles.inputGroup}>
                        <Ionicons name="person-outline" size={20} color={COLOR_ACCENT} style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Họ tên của bạn"
                            value={name}
                            onChangeText={setName}
                            placeholderTextColor="#a0a0a0"
                            editable={!isLoading}
                        />
                    </View>

                    {/* Email */}
                    <View style={styles.inputGroup}>
                        <Ionicons name="mail-outline" size={20} color={COLOR_ACCENT} style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            placeholderTextColor="#a0a0a0"
                            editable={!isLoading}
                        />
                    </View>
                    
                    {/* --- KHU VỰC MẬT KHẨU TỰ CHỌN VÀ TỰ SINH --- */}
                    <Text style={styles.roleLabel}>Mật khẩu:</Text>
                    
                    <View style={styles.inputGroup}>
                        <Ionicons name="lock-closed-outline" size={20} color={COLOR_ACCENT} style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Mật khẩu (Tối thiểu 8 ký tự, đủ yếu tố)"
                            value={password}
                            onChangeText={handlePasswordChange}
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

                    {/* Hiển thị độ mạnh của mật khẩu tự đặt */}
                    {!isGeneratedPassword && password.length > 0 && (
                        <Text style={[styles.strengthText, {
                            color: passwordStrength.strong ? COLOR_PRIMARY_GREEN : '#e74c3c'
                        }]}>
                            {passwordStrength.strong ? "✅ " : "❌ "}
                            {passwordStrength.message}
                        </Text>
                    )}
                    
                    {/* Khu vực Tự sinh/Sao chép mật khẩu */}
                    {!isGeneratedPassword ? (
                        <TouchableOpacity style={styles.generateBtn} onPress={handleGeneratePassword} disabled={isLoading}>
                            {isLoading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <Ionicons name="key-outline" size={20} color="#fff" />
                                    <Text style={styles.copyText}>Tự sinh mật khẩu bảo mật cao</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.passwordOutputContainer}>
                            <Text style={styles.passwordGeneratedText}>Mật khẩu đã sinh. Sao chép và đăng ký!</Text>
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
                        {/* Role Admin */}
                        <TouchableOpacity
                            style={[
                                styles.roleBtn,
                                role === "admin" && styles.roleActive,
                                role === "admin" && styles.roleActiveShadow,
                            ]}
                            onPress={() => setRole("admin")}
                            disabled={isLoading}
                        >
                            <Ionicons name="shield-half-outline" size={18} color={role === "admin" ? "#fff" : COLOR_ACCENT} />
                            <Text style={[styles.roleText, role === "admin" && styles.roleTextActive]}>Admin</Text>
                        </TouchableOpacity>
                        {/* Role Staff */}
                        <TouchableOpacity
                            style={[
                                styles.roleBtn,
                                role === "staff" && styles.roleActive,
                                role === "staff" && styles.roleActiveShadow,
                            ]}
                            onPress={() => setRole("staff")}
                            disabled={isLoading}
                        >
                            <Ionicons name="people-outline" size={18} color={role === "staff" ? "#fff" : COLOR_ACCENT} />
                            <Text style={[styles.roleText, role === "staff" && styles.roleTextActive]}>Nhân viên</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Nút Đăng ký */}
                    <TouchableOpacity
                        style={[
                            styles.signUpBtn,
                            isSignUpDisabled && styles.signUpBtnDisabled
                        ]}
                        onPress={handleSignUp}
                        disabled={isSignUpDisabled}
                    >
                        {isLoading ? (
                               <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.signUpText}>ĐĂNG KÝ NGAY</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                        <Text style={styles.link}>⬅️ Đã có tài khoản? <Text style={styles.linkBold}>Đăng nhập</Text></Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}


const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG_COLOR },
    content: { // **THAY THẾ scrollContent**
        flex: 1, // Chiếm toàn bộ không gian
        paddingHorizontal: 30,
        paddingTop: Platform.OS === 'ios' ? 40 : 20, // Thêm padding trên cho thanh trạng thái
        paddingBottom: 20,
        justifyContent: "space-between", // **QUAN TRỌNG: Phân bổ không gian giữa header và form**
    },
    
    // --- Header (Logo) Styles ---
    header: {
        alignItems: "center",
        marginBottom: 10, // Giảm margin dưới để logo sát hơn
        marginTop: 0,
    },
    logo: {
        width: 130, // **GIẢM LOGO RẤT NHIỀU ĐỂ VỪA TRANG**
        height: 130, // **GIẢM LOGO RẤT NHIỀU ĐỂ VỪA TRANG**
        marginBottom: -10,
    },
    brandTitle: {
        fontSize: 28,
        fontWeight: "900",
        color: COLOR_PRIMARY_GREEN,
        letterSpacing: 0.5,
        marginTop: 0,
        lineHeight: 30,
    },
    subtitle: {
        fontSize: 16,
        color: "#666",
        marginTop: 5,
        fontWeight: '500',
        lineHeight: 20,
    },
    form: { width: "100%" },
    
    // --- Input Styles (Soft UI) ---
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: BG_COLOR,
        borderRadius: 15,
        marginBottom: 15, // Giảm margin input
        paddingHorizontal: 15,
        shadowColor: '#a9c0d3',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#ffffff',
    },
    icon: { marginRight: 15 },
    toggleBtn: { padding: 5 },
    input: {
        flex: 1,
        fontSize: 17,
        color: '#333',
        height: 50,
        paddingVertical: 10,
    },
    strengthText: {
        fontSize: 13,
        marginBottom: 10, // Giảm margin
        paddingLeft: 5,
        fontWeight: '600',
    },

    // --- Password Generation Styles ---
    generateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLOR_ACCENT,
        padding: 15,
        borderRadius: 15,
        marginBottom: 10, // Giảm margin
        shadowColor: COLOR_ACCENT,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    passwordOutputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: BG_COLOR,
        borderRadius: 15,
        marginBottom: 10, // Giảm margin
        shadowColor: '#a9c0d3',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#ffffff',
    },
    passwordGeneratedText: {
        flex: 1,
        paddingVertical: 15,
        paddingLeft: 15,
        fontSize: 14,
        color: '#333',
        fontStyle: 'italic',
    },
    copyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: COLOR_COPY,
        borderTopRightRadius: 15,
        borderBottomRightRadius: 15,
    },
    copyBtnCopied: {
        backgroundColor: COLOR_PRIMARY_GREEN,
    },
    copyText: {
        color: "#fff",
        fontWeight: "bold",
        marginLeft: 5
    },
    warningText: {
        color: '#e74c3c',
        textAlign: 'center',
        marginBottom: 10, // Giảm margin
        fontStyle: 'italic',
        fontWeight: '700',
        fontSize: 13,
    },

    // --- Role Styles (Đồng bộ) ---
    roleLabel: {
        fontSize: 16,
        color: "#333",
        marginBottom: 10,
        fontWeight: '700'
    },
    roleContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 15, // Giảm margin
    },
    roleBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10, // Giảm padding role
        borderRadius: 15,
        backgroundColor: BG_COLOR,
        marginHorizontal: 5,
        borderWidth: 1,
        borderColor: '#ffffff',
        shadowColor: '#a9c0d3',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
        elevation: 8,
    },
    roleActive: {
        backgroundColor: COLOR_PRIMARY_GREEN,
        borderWidth: 0,
    },
    roleActiveShadow: {
        shadowColor: COLOR_PRIMARY_GREEN,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 15,
    },
    roleText: { color: "#333", fontWeight: "600", marginLeft: 5, fontSize: 16 },
    roleTextActive: { color: "#fff" },

    // --- Button Styles ---
    signUpBtn: {
        backgroundColor: COLOR_PRIMARY_GREEN,
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 15,
        alignItems: "center",
        marginBottom: 10, // Giảm margin
        marginTop: 5, // Giảm margin
        shadowColor: COLOR_PRIMARY_GREEN,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 20,
    },
    signUpBtnDisabled: {
        backgroundColor: "#9e9e9e",
        shadowOpacity: 0.1,
        elevation: 5,
    },
    signUpText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 17,
        letterSpacing: 1
    },
    link: {
        color: "#888",
        textAlign: "center",
        marginTop: 10,
        fontSize: 15
    },
    linkBold: {
        color: COLOR_ACCENT,
        fontWeight: '700',
    }
});