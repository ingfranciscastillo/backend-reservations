import dotenv from "dotenv";
dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3000"),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  platformFeePercentage: parseFloat(
    process.env.PLATFORM_FEE_PERCENTAGE || "15"
  ),
};
