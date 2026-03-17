import { Router } from "express";
import { multerUploader } from "../../config/multer.config";
import { authMiddleware, roleMiddleware } from "../../middleware/auth-middlewares";

const mediaRouter = Router();


mediaRouter.post("/upload-avatar",authMiddleware,roleMiddleware(["ADMIN","USER"]), multerUploader.fields([
    { name: "avatar", maxCount: 1 }
]), (req, res) => {
    // req.files holo ekta object jar moddhe array thake
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    // 'avatar' field theke prothom file ta nao
    const avatarFile = files?.['avatar'] ? files['avatar'][0] : null;
    if (!avatarFile) {
        return res.status(400).json({ message: "No avatar uploaded!" });
    }
    res.json({
        secure_url: avatarFile.path,    // Cloudinary URL
        public_id: avatarFile.filename, // Cloudinary Public ID
    });
});

mediaRouter.post("/upload-images",multerUploader.fields([
    {name:"images",maxCount:5}
]),(req,res)=>{
const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // ২. Multiple Files (Documents) - Loop chaliye data nite hobe
    const images = files?.['images']?.map(file => ({
        url: file.path,
        id: file.filename,
        originalName: file.originalname
    })) || [];

    res.json({
   
     images
    });
})

export default mediaRouter