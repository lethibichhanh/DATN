import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Switch,
    Alert,
    Platform,
} from "react-native";
// Cần import I18n thay vì i18n mặc định để khởi tạo instance
import { I18n } from 'i18n-js'; 
import * as Localization from 'expo-localization'; 


// --------------------------------------------------------
// CẤU HÌNH ĐA NGÔN NGỮ (ĐÃ ĐƯỢC GIỮ LẠI CẤU TRÚC ĐỂ DỊCH CHỨ KHÔNG DÙNG TÍNH NĂNG CHUYỂN NGÔN NGỮ)
// --------------------------------------------------------
// 1. Khởi tạo I18n Instance
const i18n = new I18n(); 

const translations = {
    en: { 
        title: "Settings", 
        general: "General Settings",
        theme: "Dark Mode",
        notifications: "Notifications",
        themeSub: "Toggle between light and dark mode.",
        notificationsSub: "Receive alerts for inventory, sales, etc.",
        
        // NEW KEYS for Data Management
        data: "Data Management",
        autoSync: "Automatic Data Sync",
        autoSyncSub: "Automatically sync local data with Firestore.",
        inventoryThreshold: "Inventory Alert Threshold",
        inventoryThresholdSub: "Set minimum stock level for alerts (e.g., 20%).",
        clearCache: "Clear Local Cache",
        clearCacheSub: "Remove temporary files and locally stored data.",
        
        about: "About App",
        version: "Version: 1.0.0",
    },
    vi: { 
        title: "Cài Đặt Ứng Dụng", 
        general: "Cài Đặt Chung",
        theme: "Chế Độ Tối",
        notifications: "Thông Báo",
        themeSub: "Chuyển đổi giữa chế độ sáng và tối.",
        notificationsSub: "Nhận thông báo về tồn kho, bán hàng, v.v.",
        
        // NEW KEYS for Data Management
        data: "Quản Lý Dữ Liệu",
        autoSync: "Tự động Đồng bộ hóa",
        autoSyncSub: "Tự động đồng bộ dữ liệu cục bộ với Firestore.",
        inventoryThreshold: "Ngưỡng Cảnh báo Tồn Kho",
        inventoryThresholdSub: "Đặt mức tồn kho tối thiểu cho cảnh báo.",
        clearCache: "Xóa Dữ Liệu Tạm",
        clearCacheSub: "Xóa các tệp tạm thời và dữ liệu lưu trữ cục bộ.",
        
        about: "Thông Tin Ứng Dụng",
        version: "Phiên bản: 1.0.0",
    },
};

// Thiết lập ngôn ngữ mặc định (sẽ ưu tiên Tiếng Việt nếu tồn tại)
const deviceLocale = Localization.getLocales()[0].languageCode;
i18n.locale = deviceLocale?.includes('vi') ? 'vi' : 'en'; 
i18n.enableFallback = true; 
i18n.translations = translations;

// --------------------------------------------------------
// COMPONENT CON: NÚT TÙY CHỌN (Option Card)
// --------------------------------------------------------

interface SettingItemProps {
    title: string;
    subTitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    type: 'action' | 'toggle' | 'info';
    onPress?: () => void;
    value?: boolean;
    onToggle?: (value: boolean) => void;
}

const SettingItem: React.FC<SettingItemProps> = ({ 
    title, 
    subTitle, 
    icon, 
    color, 
    type, 
    onPress, 
    value, 
    onToggle 
}) => {
    
    // Tùy chọn render cho loại Action (có mũi tên)
    const renderAction = () => (
        <TouchableOpacity style={styles.itemContainer} onPress={onPress}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons name={icon} size={24} color={color} style={styles.itemIcon} />
                <View style={styles.textContainer}>
                    <Text style={styles.itemTitle}>{title}</Text>
                    <Text style={styles.itemSubTitle}>{subTitle}</Text>
                </View>
            </View>
            {type === 'action' && ( // Chỉ hiển thị mũi tên cho type 'action'
                <Ionicons name="chevron-forward-outline" size={20} color="#ccc" />
            )}
        </TouchableOpacity>
    );

    // Tùy chọn render cho loại Toggle (có switch)
    const renderToggle = () => (
        <View style={styles.itemContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons name={icon} size={24} color={color} style={styles.itemIcon} />
                <View style={styles.textContainer}>
                    <Text style={styles.itemTitle}>{title}</Text>
                    <Text style={styles.itemSubTitle}>{subTitle}</Text>
                </View>
            </View>
            <Switch
                trackColor={{ false: "#767577", true: color }}
                thumbColor={value ? "#f4f3f4" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={onToggle}
                value={value}
            />
        </View>
    );

    // Tùy chọn render cho loại Info (chỉ hiển thị thông tin)
    // Loại này dùng chung renderAction nhưng không có onPress/mũi tên
    if (type === 'toggle') return renderToggle();
    return renderAction();
};


// --------------------------------------------------------
// MÀN HÌNH CHÍNH: SETTINGS SCREEN
// --------------------------------------------------------

export default function SettingsScreen({ navigation }: any) {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
    // NEW STATES
    const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(true); 
    const [inventoryAlertThreshold, setInventoryAlertThreshold] = useState(20); 
    
    // --- KHÓA LƯU TRỮ ASYNCSTORAGE ---
    const THEME_KEY = '@app_theme';
    const NOTIFICATIONS_KEY = '@app_notifications';
    const AUTOSYNC_KEY = '@app_auto_sync'; 
    const THRESHOLD_KEY = '@app_inventory_threshold'; 

    // 1. Tải cài đặt khi component được mount
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const theme = await AsyncStorage.getItem(THEME_KEY);
            const notifications = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
            const sync = await AsyncStorage.getItem(AUTOSYNC_KEY);
            const threshold = await AsyncStorage.getItem(THRESHOLD_KEY);

            if (theme !== null) setIsDarkMode(theme === 'dark');
            if (notifications !== null) setIsNotificationsEnabled(notifications === 'enabled');
            if (sync !== null) setIsAutoSyncEnabled(sync === 'enabled');
            if (threshold !== null) setInventoryAlertThreshold(parseInt(threshold, 10));

        } catch (e) {
            console.error("Lỗi tải cài đặt:", e);
        }
    };

    // 2. Xử lý đổi Chế độ Tối/Sáng
    const toggleDarkMode = async (value: boolean) => {
        setIsDarkMode(value);
        try {
            await AsyncStorage.setItem(THEME_KEY, value ? 'dark' : 'light');
            Alert.alert(
                "Đã thay đổi", 
                `Chế độ ${value ? 'Tối' : 'Sáng'} đã được kích hoạt. Bạn cần khởi động lại ứng dụng để áp dụng toàn bộ giao diện (Chức năng này cần được tích hợp với context/theme provider).`
            );
        } catch (e) {
            console.error("Lỗi lưu theme:", e);
        }
    };

    // 3. Xử lý đổi Thông báo
    const toggleNotifications = async (value: boolean) => {
        setIsNotificationsEnabled(value);
        try {
            await AsyncStorage.setItem(NOTIFICATIONS_KEY, value ? 'enabled' : 'disabled');
        } catch (e) {
            console.error("Lỗi lưu thông báo:", e);
        }
    };

    // 4. Xử lý Tự động đồng bộ hóa
    const toggleAutoSync = async (value: boolean) => {
        setIsAutoSyncEnabled(value);
        try {
            await AsyncStorage.setItem(AUTOSYNC_KEY, value ? 'enabled' : 'disabled');
            // Trong ứng dụng thực tế, sẽ kích hoạt/ngưng service đồng bộ
        } catch (e) { 
            console.error("Lỗi lưu đồng bộ:", e); 
        }
    };

    // 5. Xử lý Đặt Ngưỡng Tồn Kho
    const handleSetThreshold = () => {
        Alert.prompt(
            t('inventoryThreshold') as string,
            `Nhập ngưỡng tồn kho tối thiểu cho cảnh báo (0-100%). Hiện tại: ${inventoryAlertThreshold}%`,
            (text) => {
                const num = parseInt(text || '20', 10);
                if (!isNaN(num) && num >= 0 && num <= 100) {
                    setInventoryAlertThreshold(num);
                    AsyncStorage.setItem(THRESHOLD_KEY, num.toString());
                    Alert.alert("Cập nhật thành công", `Ngưỡng cảnh báo tồn kho đã đặt là ${num}%.`);
                } else {
                    Alert.alert("Lỗi", "Ngưỡng phải là số nguyên từ 0 đến 100.");
                }
            },
            'plain-text',
            inventoryAlertThreshold.toString(),
            'numeric'
        );
    };

    // 6. Xử lý Xóa Dữ Liệu Tạm
    const handleClearCache = async () => {
        Alert.alert(
            "Xác nhận Xóa",
            "Bạn có chắc chắn muốn xóa tất cả dữ liệu tạm thời cục bộ (cache, hình ảnh tải xuống, v.v.)? Việc này có thể yêu cầu bạn đăng nhập lại.",
            [
                {
                    text: "Hủy",
                    style: "cancel",
                },
                {
                    text: "Xóa",
                    onPress: async () => {
                        try {
                            // Cố gắng xóa các key ngoại trừ theme và notifications
                            const keys = await AsyncStorage.getAllKeys();
                            const keysToKeep = [THEME_KEY, NOTIFICATIONS_KEY, AUTOSYNC_KEY, THRESHOLD_KEY];
                            const keysToDelete = keys.filter(key => !keysToKeep.includes(key));
                            await AsyncStorage.multiRemove(keysToDelete);
                            
                            console.log("Đã xóa các key AsyncStorage không cần thiết:", keysToDelete);
                            Alert.alert("Hoàn tất", "Dữ liệu tạm thời (cache) đã được xóa thành công.");
                        } catch (e) {
                            console.error("Lỗi xóa cache:", e);
                            Alert.alert("Lỗi", "Không thể xóa dữ liệu tạm thời.");
                        }
                    },
                },
            ]
        );
    };

    // Dịch các đoạn text trong màn hình settings
    const t = (key: keyof typeof translations.vi) => i18n.t(key) as string;

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container}>
                <Text style={styles.headerTitle}>{t('title')}</Text>

                {/* Phần 1: Cài Đặt Chung */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>{t('general')}</Text>

                    <SettingItem 
                        title={t('theme')}
                        subTitle={t('themeSub')}
                        icon="color-palette-outline"
                        color="#4a90e2"
                        type="toggle"
                        value={isDarkMode}
                        onToggle={toggleDarkMode}
                    />
                    
                    <SettingItem 
                        title={t('notifications')}
                        subTitle={t('notificationsSub')}
                        icon="notifications-outline"
                        color="#f5a623"
                        type="toggle"
                        value={isNotificationsEnabled}
                        onToggle={toggleNotifications}
                    />
                    
                    {/* THAY THẾ LANGUAGE BẰNG AUTO SYNC */}
                    <SettingItem 
                        title={t('autoSync')}
                        subTitle={t('autoSyncSub')}
                        icon="cloud-upload-outline"
                        color="#27ae60"
                        type="toggle"
                        value={isAutoSyncEnabled}
                        onToggle={toggleAutoSync}
                    />
                    
                </View>

                {/* Phần 2: QUẢN LÝ DỮ LIỆU (MỚI) */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>{t('data')}</Text>

                    {/* NEW SETTING: Inventory Threshold */}
                    <SettingItem 
                        title={t('inventoryThreshold')}
                        subTitle={`${t('inventoryThresholdSub')} (Hiện tại: ${inventoryAlertThreshold}%)`}
                        icon="bar-chart-outline"
                        color="#f39c12"
                        type="action"
                        onPress={handleSetThreshold}
                    />

                    {/* NEW SETTING: Clear Cache */}
                    <SettingItem 
                        title={t('clearCache')}
                        subTitle={t('clearCacheSub')}
                        icon="trash-outline"
                        color="#e74c3c"
                        type="action"
                        onPress={handleClearCache}
                    />
                </View>

                {/* Phần 3: Thông Tin Ứng Dụng (Giữ nguyên) */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>{t('about')}</Text>
                    
                    <SettingItem 
                        title={t('version')}
                        subTitle="Sản phẩm thuộc đề tài báo cáo tốt nghiệp."
                        icon="information-circle-outline"
                        color="#9b59b6"
                        type="info"
                        // Cần thêm onPress rỗng để render đúng kiểu SettingItem
                        onPress={() => {}} 
                    />
                </View>

                <View style={{ height: 50 }} />
                
            </ScrollView>
        </SafeAreaView>
    );
}

// --------------------------------------------------------
// STYLESHEET (Đẹp và Hiện đại)
// --------------------------------------------------------

const styles = StyleSheet.create({
    safeArea: { 
        flex: 1, 
        backgroundColor: '#f0f0f5', // Nền tổng thể
    },
    container: {
        flex: 1,
        paddingHorizontal: 15,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 10,
        marginBottom: 20,
        marginLeft: 5,
    },
    // --- CARD SECTION ---
    sectionCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        marginBottom: 20,
        paddingHorizontal: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3, // Android shadow
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#555',
        paddingVertical: 15,
    },
    // --- SETTING ITEM ---
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        // Dùng borderTop thay vì borderBottom để dễ quản lý tách biệt item
        borderTopWidth: 1, 
        borderTopColor: '#f0f0f5', 
    },
    itemIcon: {
        marginRight: 15,
        width: 24,
        textAlign: 'center',
    },
    textContainer: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    itemSubTitle: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
});
