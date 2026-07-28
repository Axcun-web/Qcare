import { asyncHandler } from "../middleware/asyncHandler.js";
import { authService } from "../services/auth.service.js";

/**
 * Controller hanya menangani lapisan HTTP: membaca request,
 * memanggil service, dan membentuk response. Tidak memuat business logic.
 */
export const authController = {
  register: asyncHandler(async (req, res) => {
    const user = await authService.register(req.body);

    res.status(201).json({
      success: true,
      message: "Registrasi berhasil. Silakan login.",
      data: user,
    });
  }),

  login: asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);

    res.json({
      success: true,
      message: "Login berhasil",
      data: result,
    });
  }),

  profile: asyncHandler(async (req, res) => {
    const user = await authService.getProfile(req.user.id);

    res.json({ success: true, data: user });
  }),
};
