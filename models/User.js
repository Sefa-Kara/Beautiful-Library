const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    surname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    favorites: [
      {
        bookId: String,
        title: String,
        author: String,
        dateAdded: Date,
      },
    ],
    readingHistory: [
      {
        bookId: String,
        title: String,
        author: String,
        dateRead: Date,
        completed: Boolean,
      },
    ],
    reviews: [
      {
        bookId: String,
        title: String,
        review: String,
        rating: Number,
        dateReviewed: Date,
      },
    ],
  },
  { timestamps: true }
);

// Şifre hashleme
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
});

// Şifre doğrulama metodu
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
