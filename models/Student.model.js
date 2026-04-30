import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    enrollmentNo: {
      type: String,
      required: true,
      unique: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
    },

    dob: {
      type: Date,
    },

    gender: {
      type: String,
      enum: ["Male", "Female"],
    },

    phone: {
      type: String,
    },

    personalEmail: {
      type: String,
      lowercase: true,
    },

    differentlyabled: {
      type: Boolean,
      default: false,
    },

    communicationAddress: {
      type: String,
    },

    country: {
      type: String,
    },

    permanentCity: {
      type: String,
    },

    permanentState: {
      type: String,
    },

    currentCity: {
      type: String,
    },

    currentState: {
      type: String,
    },

    SSCPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },

    SSCPassingYear: {
      type: Number,
    },

    optionafterSSC: {
      type: String,
      enum: ["HSC", "Diploma"],
    },

    HSCPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },

    HSCPassingYear: {
      type: Number,
    },

    DiplomaPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },

    DiplomaPassingYear: {
      type: Number,
    },

    UGinstitute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
    },

    UGbranch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
    },

    UGpassoutYear: {
      type: Number,
    },

    UGcgpa: {
      type: Number,
      min: 0,
      max: 10,
    },

    UGActiveBacklog: {
      type: Number,
      min: 0,
      default: 0,
    },

    UGTotalBacklog: {
      type: Number,
      min: 0,
      default: 0,
    },

    masters: {
      hasMasters: {
        type: Boolean,
        default: false,
      },
      PGinstitute: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Institute",
      },
      PGbranch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
      },
      PGpassoutYear: {
        type: Number,
      },
      PGActiveBacklog: {
        type: Number,
        min: 0,
        default: 0,
      },
      PGTotalBacklog: {
        type: Number,
        min: 0,
        default: 0,
      },
      PGcgpa: {
        type: Number,
        min: 0,
        max: 10,
      },
    },

    resumeUrl: [
      {
        type: String,
      },
    ],

    skills: [
      {
        type: String,
      },
    ],

    isEligible: {
      type: Boolean,
      default: true,
    },

    placementStatus: {
      type: String,
      enum: ["Not Placed", "Placed"],
      default: "Not Placed",
    },
    placedPhoto: {
      type: String,
    },
    achievementMessage: {
      type: String,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    companyName: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Student", studentSchema);