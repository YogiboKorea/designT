import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminUser extends Document {
  username: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdminUserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

if ((mongoose.models as any).AdminUser) {
  delete (mongoose.models as any).AdminUser;
}

export default mongoose.models.AdminUser ||
  mongoose.model<IAdminUser>('AdminUser', AdminUserSchema, 'admin_users');
