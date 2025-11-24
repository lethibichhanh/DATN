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
    ScrollView,
    SafeAreaView,
} from "react-native";
// Giả định đường dẫn này là chính xác
import { auth, db, storage } from "../../firebaseConfig"; 

// Component con cho các nút chức năng (Được thiết kế lại theo phong cách Card)
const ActionButton = ({ title, icon, color, onPress, disabled = false, subTitle }: {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    onPress: () => void;
    disabled?: boolean;
    subTitle?: string;
}) => (
    <TouchableOpacity
        style={[styles.actionButton, { opacity: disabled ? 0.6 : 1 }]}
        onPress={onPress}
        disabled={disabled}
    >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name={icon} size={24} color={color} />
            <View style={{ marginLeft: 15, flex: 1 }}>
                <Text style={styles.actionButtonTitle}>{title}</Text>
                {subTitle && <Text style={styles.actionButtonSubTitle}>{subTitle}</Text>}
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color="#ccc" />
        </View>
    </TouchableOpacity>
);

/**
 * Hàm kiểm tra độ mạnh mật khẩu theo yêu cầu:
 * - Tối thiểu 8 ký tự.
 * - Ít nhất 1 chữ hoa (A-Z).
 * - Ít nhất 1 chữ thường (a-z).
 * - Ít nhất 1 ký tự số hoặc ký tự đặc biệt (!@#$%^&*).
 */
const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
        return "Mật khẩu phải có tối thiểu 8 ký tự.";
    }
    if (!/(?=.*[a-z])/.test(password)) {
        return "Mật khẩu phải chứa ít nhất 1 chữ thường.";
    }
    if (!/(?=.*[A-Z])/.test(password)) {
        return "Mật khẩu phải chứa ít nhất 1 chữ hoa.";
    }
    // Kiểm tra ký tự số hoặc ký tự đặc biệt
    if (!/(?=.*[0-9!@#$%^&*])/.test(password)) {
        return "Mật khẩu phải chứa ít nhất 1 ký tự số hoặc ký tự đặc biệt.";
    }
    return null; // Mật khẩu hợp lệ
};


export default function TaiKhoanScreen({ navigation }: any) {
    const [user, setUser] = useState<any>(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false); 
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [showNewPassword, setShowNewPassword] = useState(false); 
    
    // STATES MỚI CHO AVATAR URL
    const [showAvatarModal, setShowAvatarModal] = useState(false); // Modal chính cho Avatar
    const [isUrlMode, setIsUrlMode] = useState(false); // Chuyển sang chế độ nhập URL
    const [avatarUrlInput, setAvatarUrlInput] = useState(""); // Lưu URL nhập vào


    // Lắng nghe trạng thái Auth và lấy thông tin user từ Firestore
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const snap = await getDoc(doc(db, "users", currentUser.uid));
                if (snap.exists()) {
                    // Lấy email từ auth object vì email có thể không có trong Firestore doc
                    setUser({ uid: currentUser.uid, ...snap.data(), email: currentUser.email });
                } else {
                    // Trường hợp user đăng ký bằng email/password nhưng chưa có doc Firestore
                    setUser({
                        uid: currentUser.uid,
                        email: currentUser.email,
                        name: currentUser.displayName || "Người dùng",
                        role: "staff", // Mặc định vai trò
                    });
                }
            } else {
                setUser(null);
            }
        });
        return unsub;
    }, []);

    // Theo dõi thay đổi của newPassword để cập nhật lỗi real-time
    useEffect(() => {
        if (newPassword.length > 0) {
            const error = validatePassword(newPassword);
            setPasswordError(error);
        } else {
            setPasswordError(null);
        }
    }, [newPassword]);


    // Đăng xuất
    const handleLogout = () => {
        Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng?", [
            { text: "Hủy", style: "cancel" },
            {
                text: "Đăng xuất",
                style: "destructive",
                onPress: async () => {
                    await signOut(auth);
                    // Sử dụng reset để đưa về màn hình Login (đảm bảo sạch stack)
                    navigation.reset({
                        index: 0,
                        routes: [{ name: "Login" }],
                    });
                },
            },
        ]);
    };

    // Đổi mật khẩu
    const handleChangePassword = async () => {
        const error = validatePassword(newPassword);
        if (error) {
            Alert.alert("⚠️ Lỗi", error);
            return;
        }

        setIsLoading(true);
        try {
            if (auth.currentUser) {
                await updatePassword(auth.currentUser, newPassword);
                Alert.alert("✅ Thành công", "Mật khẩu đã được thay đổi thành công!");
                setShowPasswordModal(false);
                setNewPassword("");
            }
        } catch (error: any) {
            console.error("Lỗi đổi mật khẩu:", error.code);
            if (error.code === 'auth/requires-recent-login') {
                Alert.alert(
                    "❌ Lỗi Bảo mật", 
                    "Để đổi mật khẩu, bạn cần phải đăng nhập lại. Vui lòng đăng xuất và đăng nhập lại ngay lập tức rồi thử đổi mật khẩu."
                );
            } else {
                Alert.alert("❌ Lỗi", "Thay đổi mật khẩu thất bại. Vui lòng thử lại. Lỗi: " + error.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Hàm cập nhật Avatar URL vào Firestore
    const updateAvatarInFirestore = async (url: string) => {
        if (!user || !user.uid) return;

        setIsLoading(true);
        try {
            await updateDoc(doc(db, "users", user.uid), {
                avatar: url,
            });
            setUser({ ...user, avatar: url });
            Alert.alert("✅ Thành công", "Ảnh đại diện đã được cập nhật!");
            // Đóng modal và reset trạng thái
            setShowAvatarModal(false);
            setIsUrlMode(false);
            setAvatarUrlInput("");
        } catch (err: any) {
            Alert.alert("❌ Lỗi", "Cập nhật ảnh đại diện thất bại. " + err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Xử lý hành động thay đổi Avatar (Tải lên hoặc nhập URL)
    const handleAvatarAction = async (actionType: 'library' | 'url') => {
        if (isLoading) return;

        if (actionType === 'url') {
            const url = avatarUrlInput.trim();
            if (!url) {
                Alert.alert("Lỗi", "Vui lòng nhập đường dẫn URL hợp lệ.");
                return;
            }
            // Chỉ kiểm tra sơ bộ định dạng (https/http)
            if (!url.startsWith('http')) {
                 Alert.alert("Lỗi", "Đường dẫn URL không hợp lệ. Phải bắt đầu bằng http:// hoặc https://");
                 return;
            }
            await updateAvatarInFirestore(url);
            return;
        }

        // --- Xử lý Tải lên từ Thư viện (actionType === 'library') ---
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

                // Upload lên Firebase Storage
                const storageRef = ref(storage, `avatars/${user.uid}.jpg`);
                await uploadBytes(storageRef, blob);

                const downloadURL = await getDownloadURL(storageRef);

                // Cập nhật Firestore
                await updateAvatarInFirestore(downloadURL);
            } catch (err: any) {
                Alert.alert("❌ Lỗi", "Cập nhật ảnh đại diện thất bại. " + err.message);
            } finally {
                setIsLoading(false);
            }
        }
    };

    if (!user) {
        return (
            <View style={[styles.container, { justifyContent: "center", alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#4a90e2" />
                <Text style={{ marginTop: 10, color: '#555' }}>Đang tải thông tin cá nhân...</Text>
            </View>
        );
    }

    // URL ảnh đại diện mặc định
    const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f9f9' }}>
            <ScrollView style={styles.container}>
                {/* 1. KHU VỰC THÔNG TIN TỔNG QUAN (HEADER) */}
                <View style={styles.profileHeader}>
                    {/* Thay đổi onPress để mở Modal chọn phương thức */}
                    <TouchableOpacity 
                        onPress={() => { setShowAvatarModal(true); setIsUrlMode(false); }} 
                        disabled={isLoading}
                    >
                        <View style={styles.avatarContainer}>
                            <Image
                                source={{ uri: user.avatar || defaultAvatar }}
                                style={styles.avatar}
                                defaultSource={{ uri: defaultAvatar }}
                            />
                            {isLoading && (
                                <View style={styles.avatarOverlay}>
                                    <ActivityIndicator size="small" color="#fff" />
                                </View>
                            )}
                            <View style={styles.cameraIcon}>
                                <Ionicons name="camera" size={18} color="#fff" />
                            </View>
                        </View>
                    </TouchableOpacity>

                    <Text style={styles.name}>{user.name}</Text>
                    <View style={styles.roleTag}>
                        <Text style={styles.roleText}>
                            {user.role === "admin" ? "Quản Trị Viên" : "Nhân Viên"}
                        </Text>
                    </View>
                    <Text style={styles.emailInfo}>📧 {user.email}</Text>
                </View>

                {/* 2. KHU VỰC CÁC CHỨC NĂNG CHUNG */}
                <View style={styles.actionSection}>
                    <Text style={styles.sectionTitle}>Tài Khoản & Bảo Mật</Text>

                    <ActionButton
                        title="Cập nhật thông tin cá nhân"
                        subTitle="Tên, v.v."
                        icon="create-outline"
                        color="#4a90e2"
                        onPress={() => navigation.navigate("DangKyNhanVien", { editUser: user })}
                    />

                    <ActionButton
                        title="Đổi mật khẩu"
                        subTitle="Thay đổi mật khẩu để tăng cường bảo mật"
                        icon="key-outline"
                        color="#f5a623"
                        onPress={() => setShowPasswordModal(true)}
                    />

                    {/* NÚT CÀI ĐẶT MỚI */}
                    <ActionButton
                        title="Cài đặt Ứng dụng"
                        subTitle="Chủ đề, thông báo,..."
                        icon="options-outline"
                        color="#3498db" 
                        onPress={() => navigation.navigate("SettingsScreen")} // Cần định nghĩa SettingsScreen trong navigator
                    />
                </View>

                {/* 3. KHU VỰC CHỨC NĂNG ADMIN */}
                {user.role === "admin" && (
                    <View style={styles.actionSection}>
                        <Text style={styles.sectionTitle}>Quản Lý Hệ Thống</Text>
                        <ActionButton
                            title="Quản lý Nhân viên"
                            subTitle="Thêm, sửa, xóa và phân quyền nhân viên"
                            icon="people-outline"
                            color="#50e3c2"
                            onPress={() => navigation.navigate("NhanVien")}
                        />
                    </View>
                )}

                {/* 4. ĐĂNG XUẤT */}
                <View style={styles.actionSection}>
                    <ActionButton
                        title="Đăng xuất"
                        icon="log-out-outline"
                        color="#e74c3c" // Màu đỏ nổi bật cho hành động chính
                        onPress={handleLogout}
                    />
                </View>

                {/* MODAL ĐỔI MẬT KHẨU (Không đổi) */}
                <Modal visible={showPasswordModal} transparent animationType="fade" onRequestClose={() => setShowPasswordModal(false)}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>🔑 Đổi mật khẩu</Text>
                            
                            {/* Input Mật khẩu có chức năng xem/ẩn */}
                            <View style={styles.modalInputGroup}>
                                <TextInput
                                    placeholder="Nhập mật khẩu mới"
                                    secureTextEntry={!showNewPassword} // Sử dụng state để điều khiển
                                    style={[styles.input, styles.inputWithIcon, passwordError ? styles.inputError : {}]}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                />
                                <TouchableOpacity 
                                    style={styles.passwordToggle}
                                    onPress={() => setShowNewPassword(!showNewPassword)}
                                >
                                    <Ionicons 
                                        name={showNewPassword ? "eye-off-outline" : "eye-outline"} 
                                        size={24} 
                                        color="#777" 
                                    />
                                </TouchableOpacity>
                            </View>
                            
                            {/* Hiển thị gợi ý mật khẩu */}
                            <Text style={styles.passwordHint}>
                                Mật khẩu cần có:
                            </Text>
                            {/* Cập nhật màu xanh khi quy tắc được đáp ứng */}
                            <Text style={[styles.passwordRule, newPassword.length >= 8 && { color: 'green' }]}>
                                • Tối thiểu 8 ký tự.
                            </Text>
                            <Text style={[styles.passwordRule, /(?=.*[A-Z])/.test(newPassword) && { color: 'green' }]}>
                                • Ít nhất 1 chữ hoa (A-Z).
                            </Text>
                            <Text style={[styles.passwordRule, /(?=.*[a-z])/.test(newPassword) && { color: 'green' }]}>
                                • Ít nhất 1 chữ thường (a-z).
                            </Text>
                            <Text style={[styles.passwordRule, /(?=.*[0-9!@#$%^&*])/.test(newPassword) && { color: 'green' }]}>
                                • Ít nhất 1 ký tự số hoặc đặc biệt.
                            </Text>

                            {isLoading ? (
                                <ActivityIndicator size="large" color="#4a90e2" style={{ marginVertical: 15 }} />
                            ) : (
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.modalButtonPrimary, { opacity: passwordError || newPassword.length === 0 ? 0.6 : 1 }]}
                                    onPress={handleChangePassword}
                                    disabled={!!passwordError || newPassword.length === 0}
                                >
                                    <Text style={styles.modalButtonText}>Lưu mật khẩu</Text>
                                </TouchableOpacity>
                            )}
                            
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonSecondary]}
                                onPress={() => {
                                    setShowPasswordModal(false);
                                    setNewPassword("");
                                    setPasswordError(null);
                                    setShowNewPassword(false); // Reset trạng thái xem mật khẩu
                                }}
                            >
                                <Text style={styles.modalButtonText}>Hủy</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
                
                {/* MODAL ĐỔI AVATAR (MỚI) */}
                <Modal visible={showAvatarModal} transparent animationType="fade" onRequestClose={() => setShowAvatarModal(false)}>
                    <View style={styles.modalContainer}>
                        <View style={[styles.modalContent, { padding: 20 }]}>
                            <Text style={styles.modalTitle}>🖼️ Đổi Ảnh Đại Diện</Text>
                            
                            {!isUrlMode ? (
                                // CHẾ ĐỘ CHỌN HÀNH ĐỘNG
                                <View>
                                    <TouchableOpacity 
                                        style={[styles.modalButton, styles.modalOptionButton]}
                                        onPress={() => handleAvatarAction('library')}
                                        disabled={isLoading}
                                    >
                                        <Ionicons name="images-outline" size={24} color="#fff" style={{ marginRight: 10 }}/>
                                        <Text style={styles.modalButtonText}>Tải lên từ Thư viện</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity 
                                        style={[styles.modalButton, styles.modalOptionButton, { backgroundColor: '#2ecc71' }]}
                                        onPress={() => {
                                            setIsUrlMode(true); 
                                            setAvatarUrlInput(''); // Reset input
                                        }}
                                        disabled={isLoading}
                                    >
                                        <Ionicons name="link-outline" size={24} color="#fff" style={{ marginRight: 10 }}/>
                                        <Text style={styles.modalButtonText}>Nhập URL Ảnh</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                // CHẾ ĐỘ NHẬP URL
                                <View>
                                    <TextInput
                                        placeholder="Dán đường dẫn URL của ảnh (bắt đầu bằng http/https)"
                                        style={[styles.input, { marginBottom: 15 }]}
                                        value={avatarUrlInput}
                                        onChangeText={setAvatarUrlInput}
                                    />
                                    
                                    {isLoading ? (
                                        <ActivityIndicator size="small" color="#4a90e2" style={{ marginVertical: 10 }} />
                                    ) : (
                                        <TouchableOpacity
                                            style={[styles.modalButton, styles.modalButtonPrimary, { opacity: avatarUrlInput.trim().length > 0 ? 1 : 0.6 }]}
                                            onPress={() => handleAvatarAction('url')}
                                            disabled={avatarUrlInput.trim().length === 0}
                                        >
                                            <Text style={styles.modalButtonText}>Cập nhật bằng URL</Text>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.modalButtonSecondary, { backgroundColor: '#3498db', marginTop: 8 }]}
                                        onPress={() => setIsUrlMode(false)}
                                        disabled={isLoading}
                                    >
                                        <Text style={styles.modalButtonText}>Quay lại</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonSecondary]}
                                onPress={() => {
                                    setShowAvatarModal(false);
                                    setIsUrlMode(false);
                                    setAvatarUrlInput("");
                                }}
                            >
                                <Text style={styles.modalButtonText}>Đóng</Text>
                            </TouchableOpacity>

                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: "#f9f9f9",
        paddingHorizontal: 20,
    },
    // --- KHU VỰC PROFILE HEADER ---
    profileHeader: {
        alignItems: "center",
        paddingVertical: 30,
        backgroundColor: '#fff',
        marginHorizontal: -20, 
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    avatarContainer: {
        width: 120, 
        height: 120, 
        borderRadius: 60, 
        marginBottom: 10,
        position: 'relative',
    },
    avatar: { 
        width: 120, 
        height: 120, 
        borderRadius: 60, 
        borderWidth: 4, 
        borderColor: '#4a90e2', // Màu border nổi bật
    },
    avatarOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#4a90e2',
        borderRadius: 15,
        padding: 5,
        borderWidth: 2,
        borderColor: '#fff',
    },
    name: { 
        fontSize: 26, 
        fontWeight: "700", 
        marginBottom: 5, 
        color: '#333' 
    },
    roleTag: {
        backgroundColor: '#e6f3ff',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 15,
        marginBottom: 10,
    },
    roleText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#4a90e2',
    },
    emailInfo: { 
        fontSize: 15, 
        color: "#777" 
    },

    // --- KHU VỰC ACTION BUTTONS ---
    actionSection: {
        marginBottom: 20,
        paddingHorizontal: 15,
        backgroundColor: '#fff',
        borderRadius: 12,
        // Card Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        paddingVertical: 15,
    },
    actionButton: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    actionButtonTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    actionButtonSubTitle: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    
    // --- MODAL CHUNG ---
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.6)",
    },
    modalContent: {
        backgroundColor: "#fff",
        padding: 25,
        borderRadius: 15,
        width: "90%",
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    modalTitle: { 
        fontWeight: "bold", 
        marginBottom: 15, 
        fontSize: 20, 
        textAlign: 'center',
        color: '#333'
    },
    // Input Group cho phép đặt icon bên trong
    modalInputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginBottom: 10, 
        position: 'relative',
    },
    // Base Input Style
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 12,
        width: "100%",
        fontSize: 16,
    },
    // Input khi có Icon (cần padding bên phải)
    inputWithIcon: {
        paddingRight: 50, // Tạo khoảng trống cho nút toggle
    },
    inputError: {
        borderColor: 'red',
        borderWidth: 2,
    },
    passwordToggle: {
        position: 'absolute',
        right: 10,
        padding: 5,
    },
    passwordHint: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        marginTop: 5,
        marginBottom: 5,
    },
    passwordRule: {
        fontSize: 13,
        color: '#999',
        marginLeft: 10,
        marginBottom: 3,
    },
    modalButton: {
        padding: 12,
        borderRadius: 8,
        width: "100%",
        alignItems: "center",
        marginTop: 10,
        flexDirection: 'row', // Dành cho nút có icon
        justifyContent: 'center',
    },
    modalButtonPrimary: {
        backgroundColor: "#4a90e2",
    },
    modalOptionButton: {
        backgroundColor: "#f5a623",
        marginBottom: 10,
    },
    modalButtonSecondary: {
        backgroundColor: "gray",
        marginTop: 15,
    },
    modalButtonText: { 
        color: "#fff", 
        fontWeight: "bold", 
        fontSize: 16 
    },
});
