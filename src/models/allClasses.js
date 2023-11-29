
const mongoose = require('mongoose');
const { Schema } = mongoose;

const AllClassesSchema = new Schema({
  Title: String,
  Teacher: String,
  Image: String,
  Price: Number,
  ShortDescription: String,
  TotalEnrollment: Number,
  teacherImg: String,
});



// Define the index on the Title field
// AllClassesSchema.index({ Title: 'text' });
// Create and export the model
const AllClasses = mongoose.model('AllClasses', AllClassesSchema);

module.exports = AllClasses;
