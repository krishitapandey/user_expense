
const { z } = require('zod');

const UserSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  role: z.enum(["Admin", "Staff"]).default("Staff")
});

module.exports = { UserSchema };