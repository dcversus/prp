#!/bin/bash
# PRP CLI Performance Load Testing Script
# Uses Artillery for comprehensive load testing

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="/var/lib/prp-performance-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TEST_NAME="prp-load-test-$TIMESTAMP"

# Test target configuration
TARGET_URL="${TARGET_URL:-http://localhost:8080}"
DURATION="${DURATION:-60}"  # seconds
CONCURRENT_USERS="${CONCURRENT_USERS:-50}"
RAMP_UP_TIME="${RAMP_UP_TIME:-30}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Error handling
error_exit() {
    echo -e "${RED}ERROR: $1${NC}"
    exit 1
}

# Success message
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Info message
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Warning message
warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."

    # Check if Artillery is installed
    if ! command -v artillery &> /dev/null; then
        error_exit "Artillery is not installed. Please install it with: npm install -g artillery"
    fi

    # Check if target is accessible
    if ! curl -f -s "$TARGET_URL/health" > /dev/null; then
        error_exit "Target $TARGET_URL is not accessible or health check failed"
    fi

    # Create results directory
    mkdir -p "$RESULTS_DIR"

    success "Prerequisites check completed"
}

# Create Artillery configuration
create_artillery_config() {
    local config_file="$RESULTS_DIR/artillery-config-$TIMESTAMP.yml"

    info "Creating Artillery configuration..."

    cat > "$config_file" << EOF
# PRP CLI Load Testing Configuration
config:
  target: '$TARGET_URL'
  phases:
    # Warm-up phase
    - duration: 30
      arrivalRate: 5
      name: "Warm up"

    # Ramp-up phase
    - duration: $RAMP_UP_TIME
      arrivalRate: 5
      rampTo: $CONCURRENT_USERS
      name: "Ramp up load"

    # Sustained load phase
    - duration: $DURATION
      arrivalRate: $CONCURRENT_USERS
      name: "Sustained load"

    # Peak load phase
    - duration: 60
      arrivalRate: $((CONCURRENT_USERS * 2))
      name: "Peak load"

    # Cool-down phase
    - duration: 30
      arrivalRate: 5
      name: "Cool down"

  processor: "./test-processor.js"

  # Default headers
  headers:
    Content-Type: 'application/json'
    User-Agent: 'PRP-LoadTester/1.0'

  # Custom metrics
  metrics:
    custom:
      response_time_p95: 'p(response_time, 95)'
      response_time_p99: 'p(response_time, 99)'
      error_rate: 'percentage($statusCode != 200)'

scenarios:
  - name: "Health Check"
    weight: 20
    flow:
      - get:
          url: "/health"
          capture:
            - json: "$.status"
              as: "health_status"
          expect:
            - statusCode: 200
            - hasProperty: "status"
            - equals:
                - "{{ health_status }}"
                - "healthy"

  - name: "MCP Server Status"
    weight: 30
    flow:
      - get:
          url: "/status"
          capture:
            - json: "$.server"
              as: "server_status"
          expect:
            - statusCode: 200
            - hasProperty: "server"

  - name: "Metrics Collection"
    weight: 25
    flow:
      - get:
          url: "/metrics"
          expect:
            - statusCode: 200
            - contentType: "text/plain"

  - name: "Token Monitoring"
    weight: 15
    flow:
      - get:
          url: "/api/tokens/status"
          expect:
            - statusCode: 200

  - name: "Agent Communication Test"
    weight: 10
    flow:
      - post:
          url: "/api/agents/ping"
          json:
            message: "Load test ping"
            timestamp: "{{ \$timestamp }}"
          expect:
            - statusCode: 200
            - hasProperty: "response"

  - name: "Orchestrator Load Test"
    weight: 5
    flow:
      - post:
          url: "/api/orchestrator/signal"
          json:
            type: "test"
            payload:
              test_id: "{{ \$randomString() }}"
              load_test: true
          expect:
            - statusCode: 200

  - name: "Concurrent Operations"
    weight: 5
    flow:
      - think: 1  # Pause for 1 second
      - get:
          url: "/health"
      - get:
          url: "/status"
      - post:
          url: "/api/test/concurrent"
          json:
            operation_id: "{{ \$randomString() }}"
EOF

    success "Artillery configuration created: $config_file"
    echo "$config_file"
}

# Create test processor for dynamic data
create_test_processor() {
    local processor_file="$RESULTS_DIR/test-processor.js"

    info "Creating test processor..."

    cat > "$processor_file" << 'EOF'
// Test processor for dynamic data generation
module.exports = {
  // Generate random string for test data
  randomString: function() {
    return Math.random().toString(36).substring(2, 15);
  },

  // Generate timestamp
  timestamp: function() {
    return new Date().toISOString();
  },

  // Generate test payload
  generateTestPayload: function(userContext, events, done) {
    const payload = {
      test_id: this.randomString(),
      timestamp: this.timestamp(),
      user_context: userContext
    };

    events.emit('customStat', 'test_payloads_generated', 1);
    return done();
  },

  // Process response
  processResponse: function(requestParams, response, context, events, done) {
    if (response.statusCode >= 200 && response.statusCode < 400) {
      events.emit('customStat', 'successful_requests', 1);
    } else {
      events.emit('customStat', 'failed_requests', 1);
    }
    return done();
  }
};
EOF

    success "Test processor created: $processor_file"
}

# Run performance test
run_performance_test() {
    local config_file="$1"
    local results_file="$RESULTS_DIR/$TEST_NAME-results.json"

    info "Starting performance test..."
    info "Target: $TARGET_URL"
    info "Duration: ${DURATION}s main phase + ${RAMP_UP_TIME}s ramp-up"
    info "Concurrent users: $CONCURRENT_USERS"

    # Run Artillery test
    artillery run "$config_file" -o "$results_file" || {
        error_exit "Performance test execution failed"
    }

    success "Performance test completed. Results saved to: $results_file"
    echo "$results_file"
}

# Generate performance report
generate_report() {
    local results_file="$1"
    local report_file="$RESULTS_DIR/$TEST_NAME-report.html"

    info "Generating performance report..."

    # Extract key metrics using jq
    local total_requests=$(jq -r '.aggregate.counts.requests' "$results_file")
    local failed_requests=$(jq -r '.aggregate.counts.errors' "$results_file")
    local response_time_p95=$(jq -r '.aggregate.latency.p95' "$results_file")
    local response_time_p99=$(jq -r '.aggregate.latency.p99' "$results_file")
    local rps=$(jq -r '.aggregate.rps.mean' "$results_file")

    # Calculate success rate
    local success_rate=$(echo "scale=2; (($total_requests - $failed_requests) * 100) / $total_requests" | bc -l)

    # Generate HTML report
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>PRP CLI Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: white; border: 1px solid #ddd; padding: 20px; border-radius: 5px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #2196F3; }
        .metric-label { color: #666; margin-top: 5px; }
        .status-good { color: #4CAF50; }
        .status-warning { color: #FF9800; }
        .status-error { color: #F44336; }
        .details { margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PRP CLI Performance Test Report</h1>
        <p><strong>Test ID:</strong> $TEST_NAME</p>
        <p><strong>Target:</strong> $TARGET_URL</p>
        <p><strong>Generated:</strong> $(date)</p>
    </div>

    <div class="metrics">
        <div class="metric-card">
            <div class="metric-value">$total_requests</div>
            <div class="metric-label">Total Requests</div>
        </div>
        <div class="metric-card">
            <div class="metric-value $([ "$(echo "$success_rate >= 99" | bc -l)" -eq 1 ] && echo "status-good" || echo "status-warning")">${success_rate}%</div>
            <div class="metric-label">Success Rate</div>
        </div>
        <div class="metric-card">
            <div class="metric-value $([ "$(echo "$response_time_p95 <= 500" | bc -l)" -eq 1 ] && echo "status-good" || ([ "$(echo "$response_time_p95 <= 1000" | bc -l)" -eq 1 ] && echo "status-warning" || echo "status-error"))">${response_time_p95}ms</div>
            <div class="metric-label">95th Percentile Response Time</div>
        </div>
        <div class="metric-card">
            <div class="metric-value $([ "$(echo "$response_time_p99 <= 1000" | bc -l)" -eq 1 ] && echo "status-good" || ([ "$(echo "$response_time_p99 <= 2000" | bc -l)" -eq 1 ] && echo "status-warning" || echo "status-error"))">${response_time_p99}ms</div>
            <div class="metric-label">99th Percentile Response Time</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">$rps</div>
            <div class="metric-label">Requests per Second</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">$CONCURRENT_USERS</div>
            <div class="metric-label">Peak Concurrent Users</div>
        </div>
    </div>

    <div class="details">
        <h2>Performance Assessment</h2>
        <table>
            <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Status</th>
                <th>Threshold</th>
            </tr>
            <tr>
                <td>Success Rate</td>
                <td>${success_rate}%</td>
                <td>$([ "$(echo "$success_rate >= 99" | bc -l)" -eq 1 ] && echo "✅ Good" || echo "⚠️ Needs Improvement")</td>
                <td>≥ 99%</td>
            </tr>
            <tr>
                <td>P95 Response Time</td>
                <td>${response_time_p95}ms</td>
                <td>$([ "$(echo "$response_time_p95 <= 500" | bc -l)" -eq 1 ] && echo "✅ Good" || ([ "$(echo "$response_time_p95 <= 1000" | bc -l)" -eq 1 ] && echo "⚠️ Acceptable" || echo "❌ Poor"))</td>
                <td>≤ 500ms</td>
            </tr>
            <tr>
                <td>P99 Response Time</td>
                <td>${response_time_p99}ms</td>
                <td>$([ "$(echo "$response_time_p99 <= 1000" | bc -l)" -eq 1 ] && echo "✅ Good" || ([ "$(echo "$response_time_p99 <= 2000" | bc -l)" -eq 1 ] && echo "⚠️ Acceptable" || echo "❌ Poor"))</td>
                <td>≤ 1000ms</td>
            </tr>
        </table>
    </div>

    <div class="details">
        <h2>Test Configuration</h2>
        <table>
            <tr><td><strong>Test Duration</strong></td><td>${DURATION}s (main phase) + ${RAMP_UP_TIME}s (ramp-up)</td></tr>
            <tr><td><strong>Concurrent Users</strong></td><td>$CONCURRENT_USERS</td></tr>
            <tr><td><strong>Target URL</strong></td><td>$TARGET_URL</td></tr>
            <tr><td><strong>Test Scenarios</strong></td><td>7 different API endpoints tested</td></tr>
        </table>
    </div>
</body>
</html>
EOF

    success "Performance report generated: $report_file"
    echo "$report_file"
}

# Compare with baseline
compare_with_baseline() {
    local results_file="$1"

    info "Comparing results with baseline..."

    local baseline_file="$RESULTS_DIR/baseline-results.json"
    if [[ -f "$baseline_file" ]]; then
        # Compare with baseline (basic implementation)
        local current_p95=$(jq -r '.aggregate.latency.p95' "$results_file")
        local baseline_p95=$(jq -r '.aggregate.latency.p95' "$baseline_file")
        local current_rps=$(jq -r '.aggregate.rps.mean' "$results_file")
        local baseline_rps=$(jq -r '.aggregate.rps.mean' "$baseline_file")

        if [[ -n "$current_p95" && -n "$baseline_p95" ]]; then
            local pct_change=$(echo "scale=2; (($current_p95 - $baseline_p95) * 100) / $baseline_p95" | bc -l)
            local rps_change=$(echo "scale=2; (($current_rps - $baseline_rps) * 100) / $baseline_rps" | bc -l)

            info "Performance comparison with baseline:"
            info "  P95 Response Time: ${pct_change}% (baseline: ${baseline_p95}ms, current: ${current_p95}ms)"
            info "  Throughput: ${rps_change}% (baseline: ${baseline_rps} RPS, current: ${current_rps} RPS)"

            if (( $(echo "$pct_change > 10" | bc -l) )); then
                warn "Response time degraded by more than 10%"
            fi

            if (( $(echo "$rps_change < -10" | bc -l) )); then
                warn "Throughput degraded by more than 10%"
            fi
        fi
    else
        info "No baseline found for comparison. This test will be used as baseline for future tests."
        cp "$results_file" "$baseline_file"
    fi
}

# Send notifications
send_notification() {
    local status="$1"
    local report_file="$2"

    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local message="PRP Performance Test $status: Test $TEST_NAME completed. Report available."
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK_URL" || true
    fi

    if [[ -n "${EMAIL_RECIPIENT:-}" && -f "$report_file" ]]; then
        echo "Performance test report attached" | mail -s "PRP Performance Test $status" -a "$report_file" "$EMAIL_RECIPIENT" || true
    fi
}

# Main function
main() {
    log "Starting PRP CLI performance load testing"

    check_prerequisites
    config_file=$(create_artillery_config)
    create_test_processor
    results_file=$(run_performance_test "$config_file")
    report_file=$(generate_report "$results_file")
    compare_with_baseline "$results_file"

    success "Performance testing completed successfully!"
    info "Results: $results_file"
    info "Report: $report_file"

    # Send success notification
    send_notification "SUCCESS" "$report_file"

    # Cleanup
    rm -f "$config_file"
    rm -f "$RESULTS_DIR/test-processor.js"
}

# Trap cleanup
trap cleanup() {
    info "Cleanup in progress..."
    rm -f /tmp/artillery-* 2>/dev/null || true
}
trap cleanup EXIT

# Error handling
trap 'error_exit "Performance test failed at line $LINENO"' ERR

# Run main function
main "$@"