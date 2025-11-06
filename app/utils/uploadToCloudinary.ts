// app/utils/uploadToCloudinary.ts
import { CLOUDINARY_URL, UPLOAD_PRESET } from "../config/cloudinaryConfig"; 

export const uploadToCloudinary = async (imageUri: string): Promise<string | null> => {
  const data = new FormData();
  
  // Chuẩn bị dữ liệu file: { uri, type, name }
  data.append("file", {
    uri: imageUri,
    type: "image/jpeg", // Giả định là JPEG
    name: "avatar.jpg",
  } as any);

  data.append("upload_preset", UPLOAD_PRESET); // Thêm unsigned preset

  try {
    const response = await fetch(CLOUDINARY_URL, {
      method: "POST",
      body: data,
    });

    const result = await response.json();

    // Nếu upload thành công, trả về secure_url
    if (response.ok && result.secure_url) {
        console.log("Upload Cloudinary Success:", result.secure_url);
        return result.secure_url;
    } else {
        // Log lỗi chi tiết từ Cloudinary nếu có
        console.error("Cloudinary Upload Error:", result.error ? result.error.message : "Unknown Error");
        return null;
    }

  } catch (err) {
    console.error("Upload network error:", err);
    return null;
  }
};