const fs = require('fs');
const path = require('path');

// Global teardown for Jest test environment
async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');
  
  // Cleanup test data
  await cleanupTestData();
  
  // Stop test services
  await stopTestServices();
  
  // Generate test reports summary
  await generateTestSummary();
  
  // Clean up temporary files
  await cleanupTempFiles();
  
  console.log('✅ Test environment cleanup complete');
}

async function cleanupTestData() {
  console.log('🗑️  Cleaning up test data...');
  
  const testDirs = ['test-data', 'test-results'];
  
  testDirs.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    
    if (fs.existsSync(fullPath)) {
      const files = fs.readdirSync(fullPath);
      files.forEach(file => {
        const filePath = path.join(fullPath, file);
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          // Ignore errors for locked files
        }
      });
    }
  });
}

async function stopTestServices() {
  console.log('🛑 Stopping test services...');
  
  return new Promise((resolve) => {
    // Simulate service shutdown
    setTimeout(() => {
      console.log('   Test services stopped');
      resolve();
    }, 500);
  });
}

async function generateTestSummary() {
  console.log('📊 Generating test summary...');
  
  const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
  
  if (fs.existsSync(coveragePath)) {
    try {
      const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      
      const summary = {
        timestamp: new Date().toISOString(),
        total: {
          lines: coverageData.total.lines.pct,
          functions: coverageData.total.functions.pct,
          branches: coverageData.total.branches.pct,
          statements: coverageData.total.statements.pct
        },
        threshold: {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80
        }
      };
      
      fs.writeFileSync(
        path.join(process.cwd(), 'test-summary.json'),
        JSON.stringify(summary, null, 2)
      );
      
      console.log('   Test summary generated');
    } catch (error) {
      console.error('   Failed to generate test summary:', error.message);
    }
  }
}

async function cleanupTempFiles() {
  console.log('🗂️  Cleaning up temporary files...');
  
  // Clean up any temporary files created during tests
  const tempPatterns = [
    '*.tmp',
    '*.temp',
    '.jest-cache',
    'test-*.log'
  ];
  
  tempPatterns.forEach(pattern => {
    const { execSync } = require('child_process');
    try {
      execSync(`find . -name "${pattern}" -type f -delete`, { cwd: process.cwd() });
    } catch (error) {
      // Ignore errors if no files found
    }
  });
}

module.exports = globalTeardown;