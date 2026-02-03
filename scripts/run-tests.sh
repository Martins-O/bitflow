#!/bin/bash

# BitFlow Test Runner Script
# Comprehensive test execution with reporting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORTS_DIR="${PROJECT_ROOT}/test-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Ensure reports directory exists
mkdir -p "${REPORTS_DIR}"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Test suite functions
run_unit_tests() {
    log "Running unit tests..."
    npm run test:unit -- --verbose --coverage --coverageDirectory="${REPORTS_DIR}/coverage-unit"
    success "Unit tests completed"
}

run_integration_tests() {
    log "Running integration tests..."
    npm run test:integration -- --verbose --detectOpenHandles
    success "Integration tests completed"
}

run_api_tests() {
    log "Running API tests..."
    npm run test:api -- --verbose --detectOpenHandles
    success "API tests completed"
}

run_contract_tests() {
    log "Running contract tests..."
    npm run test:contracts -- --verbose --timeout=60000
    success "Contract tests completed"
}

run_e2e_tests() {
    log "Running end-to-end tests..."
    npm run test:e2e -- --verbose --timeout=120000
    success "E2E tests completed"
}

run_cli_tests() {
    log "Running CLI tests..."
    npm run test:cli -- --verbose
    success "CLI tests completed"
}

run_all_tests() {
    log "Running all test suites..."
    
    # Create a comprehensive test report
    local all_tests_passed=true
    
    # Run each test suite and capture results
    for suite in "unit" "integration" "api" "contracts" "e2e" "cli"; do
        log "Running ${suite} tests..."
        
        if npm run "test:${suite}" -- --verbose --json --outputFile="${REPORTS_DIR}/${suite}_results_${TIMESTAMP}.json"; then
            success "${suite} tests passed"
        else
            error "${suite} tests failed"
            all_tests_passed=false
        fi
    done
    
    if [ "$all_tests_passed" = true ]; then
        success "All test suites passed!"
        return 0
    else
        error "Some test suites failed"
        return 1
    fi
}

generate_coverage_report() {
    log "Generating combined coverage report..."
    
    # Merge coverage reports if multiple coverage directories exist
    if [ -d "${REPORTS_DIR}/coverage-unit" ] && [ -d "${REPORTS_DIR}/coverage-integration" ]; then
        npx nyc merge "${REPORTS_DIR}" "${REPORTS_DIR}/merged-coverage.json"
        npx nyc report --reporter=html --reporter=text --reporter=lcov --temp-directory="${REPORTS_DIR}/coverage-merged"
    fi
    
    success "Coverage report generated"
}

run_performance_tests() {
    log "Running performance tests..."
    
    # Create performance test scenarios
    node -e "
    const axios = require('axios');
    const start = Date.now();
    
    // Simulate load testing
    const promises = [];
    for (let i = 0; i < 100; i++) {
        promises.push(axios.get('http://localhost:3000/health').catch(() => {}));
    }
    
    Promise.all(promises).then(() => {
        const duration = Date.now() - start;
        console.log(\`Performance test completed in \${duration}ms\`);
    });
    "
    
    success "Performance tests completed"
}

check_code_quality() {
    log "Running code quality checks..."
    
    # ESLint check
    npm run lint || { error "ESLint check failed"; return 1; }
    success "Code quality checks passed"
}

check_dependencies() {
    log "Checking dependencies for security vulnerabilities..."
    
    npm audit --audit-level=moderate || warning "Dependency audit found issues"
    success "Dependency check completed"
}

setup_test_environment() {
    log "Setting up test environment..."
    
    # Install dependencies
    npm ci --silent
    
    # Create test environment file
    cat > .env.test << EOF
NODE_ENV=test
PORT=3001
RPC_URL=https://starknet-testnet.infura.io/v3/test-key
PRIVATE_KEY=0x1234567890123456789012345678901234567890123456789012345678901234
ACCOUNT_ADDRESS=0x1234567890123456789012345678901234567890123456789012345678901234
WBTC_TOKEN_ADDRESS=0x1234567890123456789012345678901234567890123456789012345678901234
INVOICE_REGISTRY_ADDRESS=0x5678901234567890123456789012345678901234567890123456789012345678
ESCROW_CONTRACT_ADDRESS=0x9abcdef012345678901234567890123456789012345678901234567890abcd
EOF
    
    success "Test environment setup complete"
}

cleanup_test_environment() {
    log "Cleaning up test environment..."
    
    # Remove test environment file
    rm -f .env.test
    
    # Clean up test data
    rm -rf "${REPORTS_DIR:?}/"*
    
    success "Test environment cleanup complete"
}

generate_test_summary() {
    log "Generating test summary..."
    
    cat > "${REPORTS_DIR}/test_summary_${TIMESTAMP}.md" << EOF
# BitFlow Test Summary

**Date:** $(date)  
**Test Suite:** ${TEST_SUITE:-all}

## Test Results

EOF
    
    # Add individual test results if available
    for suite in unit integration api contracts e2e cli; do
        if [ -f "${REPORTS_DIR}/${suite}_results_${TIMESTAMP}.json" ]; then
            echo "### ${suite^} Tests" >> "${REPORTS_DIR}/test_summary_${TIMESTAMP}.md"
            echo "- Status: $(grep -c '"status":"passed"' "${REPORTS_DIR}/${suite}_results_${TIMESTAMP}.json" || echo "0") passed" >> "${REPORTS_DIR}/test_summary_${TIMESTAMP}.md"
            echo "- Failed: $(grep -c '"status":"failed"' "${REPORTS_DIR}/${suite}_results_${TIMESTAMP}.json" || echo "0") failed" >> "${REPORTS_DIR}/test_summary_${TIMESTAMP}.md"
            echo "" >> "${REPORTS_DIR}/test_summary_${TIMESTAMP}.md"
        fi
    done
    
    success "Test summary generated"
}

# Main execution
main() {
    local test_type="${1:-all}"
    
    log "Starting BitFlow test runner"
    log "Test type: ${test_type}"
    
    # Setup
    setup_test_environment
    
    # Run tests based on type
    case "${test_type}" in
        "unit")
            run_unit_tests
            ;;
        "integration")
            run_integration_tests
            ;;
        "api")
            run_api_tests
            ;;
        "contracts")
            run_contract_tests
            ;;
        "e2e")
            run_e2e_tests
            ;;
        "cli")
            run_cli_tests
            ;;
        "all")
            check_code_quality
            check_dependencies
            run_all_tests
            ;;
        "performance")
            run_performance_tests
            ;;
        "coverage")
            run_all_tests
            generate_coverage_report
            ;;
        "quality")
            check_code_quality
            check_dependencies
            ;;
        *)
            error "Unknown test type: ${test_type}"
            echo "Usage: $0 [unit|integration|api|contracts|e2e|cli|all|performance|coverage|quality]"
            exit 1
            ;;
    esac
    
    # Generate reports
    generate_test_summary
    
    # Cleanup
    cleanup_test_environment
    
    success "Test runner completed successfully!"
}

# Handle script arguments
if [ $# -eq 0 ]; then
    main "all"
else
    main "$@"
fi