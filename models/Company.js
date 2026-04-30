import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    logo: {
      type: String,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
    },

    contactPerson: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
    },

    location: {
      type: String,
    },

    website: {
      type: String,
    },

    description: {
      type: String,
    },

    totalOffers: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Company", companySchema);