const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testConnection() {
  try {
    console.log('Testing MongoDB connection...');
    console.log('MongoDB URI from env:', process.env.MONGODB_URI ? 'Found' : 'Not found');
    
    // Use the direct URI for testing
    const mongoUri = 'mongodb+srv://shanidsajjatuzislamrabid:hwKc2iTXYDMvuJ3B@shanidsajjatuzislamrabi.8uafjnj.mongodb.net/bookmarketplace';
    console.log('Using direct URI for connection test...');
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Successfully connected to MongoDB!');
    
    // Test basic operations
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    await mongoose.connection.close();
    console.log('Connection closed.');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();