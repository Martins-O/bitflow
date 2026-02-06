#!/bin/bash

echo "Building BitFlow Backend for Production"
echo "======================================"

# Create build directory
mkdir -p build

echo "Checking backend files..."

# Check if main files exist
if [ -f "backend/src/app.js" ]; then
    echo "  Main app file found"
else
    echo "  ERROR: Missing backend/src/app.js"
    exit 1
fi

if [ -f "backend/src/services/contractService.js" ]; then
    echo "  Contract service found"
else
    echo "  ERROR: Missing backend/src/services/contractService.js"
    exit 1
fi

if [ -f "backend/routes/invoices.js" ]; then
    echo "  Invoice routes found"
else
    echo "  ERROR: Missing backend/routes/invoices.js"
    exit 1
fi

echo ""
echo "Creating production build..."

# Copy backend files to build directory
cp -r backend build/
echo "  Backend files copied to build/"

# Copy package.json and .env to build
cp package.json build/
if [ -f ".env" ]; then
    cp .env build/
fi
echo "  Package.json copied"

# Copy only production dependencies
cd build
npm install --production 2>/dev/null
echo "  Production dependencies installed"

# Create startup script that uses the app's exported module
cat > start.js << 'EOF'
#!/usr/bin/env node

// Production entry point
require('dotenv').config();

const { app, initializeContracts } = require('./backend/src/app.js');

const port = process.env.PORT || 3000;
app.listen(port, async () => {
  console.log("BitFlow API running in production mode on port " + port);
  console.log("Health check: http://localhost:" + port + "/health");
  await initializeContracts();
});
EOF

chmod +x start.js
echo "  Production startup script created"

echo ""
echo "Build Summary:"
echo "  Build directory: ./build"
echo "  Start command: node start.js"
echo "  Environment: Production"
echo ""

echo "Backend build completed successfully!"
echo ""
echo "To test the build:"
echo "  cd build"
echo "  node start.js"
echo ""
echo "To create production package:"
echo "  tar -czf bitflow-backend.tar.gz build/"
