#!/bin/bash
# PRP CLI Automated Deployment Script with Rollback Capabilities
# Supports blue-green and canary deployment strategies

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOYMENT_LOG="/var/log/prp-deployment.log"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}"
ROLLBACK_ENABLED="${ROLLBACK_ENABLED:-true}"

# Environment configuration
ENVIRONMENT="${ENVIRONMENT:-production}"
NAMESPACE="${NAMESPACE:-prp-system}"
SERVICE_NAME="${SERVICE_NAME:-prp-mcp-server}"
CONTAINER_REGISTRY="${CONTAINER_REGISTRY:-ghcr.io/your-org/prp-cli}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Deployment metadata
DEPLOYMENT_ID="deploy-$(date +%Y%m%d_%H%M%S)"
PREVIOUS_DEPLOYMENT_FILE="/var/lib/prp-deployments/last-deployment.txt"
ROLLBACK_FILE="/var/lib/prp-deployments/rollback-${DEPLOYMENT_ID}.txt"

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$DEPLOYMENT_LOG"
}

info() { log "INFO" "$1"; }
warn() { log "WARN" "$1"; }
error() { log "ERROR" "$1"; }
success() { log "SUCCESS" "$1"; }

# Error handling
error_exit() {
    error "$1"
    if [[ "$ROLLBACK_ENABLED" == "true" ]]; then
        info "Initiating automatic rollback..."
        perform_rollback
    else
        error "Rollback is disabled. Manual intervention required."
    fi
    exit 1
}

# Success message
success_banner() {
    local message="$1"
    echo -e "\n${GREEN}🎉 ${message} 🎉${NC}\n"
    success "$message"
}

# Info banner
info_banner() {
    local message="$1"
    echo -e "\n${BLUE}ℹ️  ${message} ℹ️\n"
}

# Warning banner
warn_banner() {
    local message="$1"
    echo -e "\n${YELLOW}⚠️  ${message} ⚠️\n"
}

# Error banner
error_banner() {
    local message="$1"
    echo -e "\n${RED}❌ ${message} ❌\n"
}

# Check prerequisites
check_prerequisites() {
    info "Checking deployment prerequisites..."

    # Check kubectl access
    if ! kubectl cluster-info >/dev/null 2>&1; then
        error_exit "Kubernetes cluster not accessible"
    fi

    # Check namespace exists
    if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        warn "Namespace $NAMESPACE does not exist. Creating it..."
        kubectl create namespace "$NAMESPACE"
    fi

    # Check Docker registry access
    if ! docker pull "$CONTAINER_REGISTRY:latest" >/dev/null 2>&1; then
        error_exit "Cannot access container registry: $CONTAINER_REGISTRY"
    fi

    # Create required directories
    mkdir -p /var/lib/prp-deployments
    mkdir -p /tmp/prp-deployments

    # Check required tools
    for tool in kubectl helm; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            error_exit "Required tool not found: $tool"
        fi
    done

    success "Prerequisites check completed"
}

# Get current deployment state
get_current_deployment() {
    kubectl get deployment "$SERVICE_NAME" -n "$NAMESPACE" -o json 2>/dev/null || echo "{}"
}

# Create deployment metadata
create_deployment_metadata() {
    local version="$1"
    local strategy="$2"
    local image="$3"

    local metadata_file="/var/lib/prp-deployments/metadata-${DEPLOYMENT_ID}.json"

    cat > "$metadata_file" << EOF
{
  "deployment_id": "$DEPLOYMENT_ID",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "namespace": "$NAMESPACE",
  "service_name": "$SERVICE_NAME",
  "version": "$version",
  "image": "$image",
  "strategy": "$strategy",
  "deployed_by": "$(whoami)",
  "rollback_enabled": $ROLLBACK_ENABLED,
  "health_check_timeout": $HEALTH_CHECK_TIMEOUT,
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')",
  "container_registry": "$CONTAINER_REGISTRY"
}
EOF

    info "Deployment metadata created: $metadata_file"
    echo "$metadata_file"
}

# Save rollback information
save_rollback_info() {
    local previous_image="$1"
    local previous_replicas="$2"
    local previous_config="$3"

    cat > "$ROLLBACK_FILE" << EOF
# Rollback information for deployment $DEPLOYMENT_ID
DEPLOYMENT_ID="$DEPLOYMENT_ID"
PREVIOUS_IMAGE="$previous_image"
PREVIOUS_REPLICAS="$previous_replicas"
PREVIOUS_CONFIG_FILE="$previous_config"
NAMESPACE="$NAMESPACE"
SERVICE_NAME="$SERVICE_NAME"
ROLLBACK_TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
EOF

    # Store as last deployment
    cp "$ROLLBACK_FILE" "$PREVIOUS_DEPLOYMENT_FILE"
    success "Rollback information saved: $ROLLBACK_FILE"
}

# Blue-Green Deployment Strategy
deploy_blue_green() {
    local new_image="$1"
    local version="$2"

    info_banner "Starting Blue-Green Deployment"
    info "New image: $new_image"
    info "Version: $version"

    # Get current active color
    local current_color="blue"
    if kubectl get service "${SERVICE_NAME}-green" -n "$NAMESPACE" >/dev/null 2>&1; then
        if kubectl get service "${SERVICE_NAME}" -n "$NAMESPACE" -o jsonpath='{.spec.selector.color}' | grep -q "green"; then
            current_color="green"
        fi
    fi
    local new_color="$([ "$current_color" = "blue" ] && echo "green" || echo "blue")"

    info "Current active: $current_color, Deploying to: $new_color"

    # Save rollback info
    local current_deployment=$(get_current_deployment)
    local current_image=$(echo "$current_deployment" | jq -r '.spec.template.spec.containers[0].image // "unknown"')
    local current_replicas=$(echo "$current_deployment" | jq -r '.spec.replicas // 3')
    local config_file="/tmp/current-deployment-$DEPLOYMENT_ID.yaml"
    echo "$current_deployment" > "$config_file"
    save_rollback_info "$current_image" "$current_replicas" "$config_file"

    # Deploy new version to inactive color
    info "Deploying $new_color environment..."

    cat > "/tmp/${new_color}-deployment.yaml" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${SERVICE_NAME}-${new_color}
  namespace: ${NAMESPACE}
  labels:
    app: ${SERVICE_NAME}
    color: ${new_color}
    version: ${version}
spec:
  replicas: ${current_replicas}
  selector:
    matchLabels:
      app: ${SERVICE_NAME}
      color: ${new_color}
  template:
    metadata:
      labels:
        app: ${SERVICE_NAME}
        color: ${new_color}
        version: ${version}
    spec:
      containers:
      - name: ${SERVICE_NAME}
        image: ${new_image}
        ports:
        - containerPort: 8080
        env:
        - name: ENVIRONMENT
          value: "${ENVIRONMENT}"
        - name: DEPLOYMENT_COLOR
          value: "${new_color}"
        - name: DEPLOYMENT_ID
          value: "${DEPLOYMENT_ID}"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
---
apiVersion: v1
kind: Service
metadata:
  name: ${SERVICE_NAME}-${new_color}
  namespace: ${NAMESPACE}
  labels:
    app: ${SERVICE_NAME}
    color: ${new_color}
spec:
  selector:
    app: ${SERVICE_NAME}
    color: ${new_color}
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP
EOF

    kubectl apply -f "/tmp/${new_color}-deployment.yaml"

    # Wait for deployment to be ready
    info "Waiting for ${new_color} deployment to be ready..."
    kubectl wait --for=condition=available --timeout=600s deployment/${SERVICE_NAME}-${new_color} -n "$NAMESPACE"

    # Health check
    info "Performing health check on ${new_color} deployment..."
    if ! perform_health_check "${SERVICE_NAME}-${new_color}"; then
        error_exit "Health check failed for ${new_color} deployment"
    fi

    # Switch traffic
    info "Switching traffic to ${new_color}..."

    cat > "/tmp/switch-traffic.yaml" << EOF
apiVersion: networking.k8s.io/v1
kind: Service
metadata:
  name: ${SERVICE_NAME}
  namespace: ${NAMESPACE}
spec:
  selector:
    app: ${SERVICE_NAME}
    color: ${new_color}
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer
EOF

    kubectl apply -f "/tmp/switch-traffic.yaml"

    # Verify traffic switch
    info "Verifying traffic switch..."
    sleep 10
    if ! perform_health_check "$SERVICE_NAME"; then
        warn "Traffic switch verification failed, rolling back..."
        perform_rollback
        return 1
    fi

    # Cleanup old deployment
    if [[ "$current_color" != "blue" ]]; then
        info "Cleaning up $current_color deployment..."
        kubectl delete deployment "${SERVICE_NAME}-${current_color}" -n "$NAMESPACE" --ignore-not-found=true
        kubectl delete service "${SERVICE_NAME}-${current_color}" -n "$NAMESPACE" --ignore-not-found=true
    fi

    # Cleanup temp files
    rm -f "/tmp/${new_color}-deployment.yaml" "/tmp/switch-traffic.yaml"

    success_banner "Blue-Green deployment completed successfully!"
    info "Active deployment: $new_color"
    info "Version: $version"
}

# Canary Deployment Strategy
deploy_canary() {
    local new_image="$1"
    local version="$2"
    local canary_weight="${3:-10}"  # Default 10% traffic

    info_banner "Starting Canary Deployment"
    info "New image: $new_image"
    info "Version: $version"
    info "Canary weight: ${canary_weight}%"

    # Save rollback info
    local current_deployment=$(get_current_deployment)
    local current_image=$(echo "$current_deployment" | jq -r '.spec.template.spec.containers[0].image // "unknown"')
    local current_replicas=$(echo "$current_deployment" | jq -r '.spec.replicas // 3')
    local config_file="/tmp/current-deployment-$DEPLOYMENT_ID.yaml"
    echo "$current_deployment" > "$config_file"
    save_rollback_info "$current_image" "$current_replicas" "$config_file"

    # Create canary deployment
    local canary_replicas=$((current_replicas * canary_weight / 100))
    if [[ $canary_replicas -lt 1 ]]; then
        canary_replicas=1
    fi

    info "Creating canary deployment with $canary_replicas replicas..."

    cat > "/tmp/canary-deployment.yaml" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${SERVICE_NAME}-canary
  namespace: ${NAMESPACE}
  labels:
    app: ${SERVICE_NAME}
    deployment: canary
    version: ${version}
spec:
  replicas: ${canary_replicas}
  selector:
    matchLabels:
      app: ${SERVICE_NAME}
      deployment: canary
  template:
    metadata:
      labels:
        app: ${SERVICE_NAME}
        deployment: canary
        version: ${version}
    spec:
      containers:
      - name: ${SERVICE_NAME}
        image: ${new_image}
        ports:
        - containerPort: 8080
        env:
        - name: ENVIRONMENT
          value: "${ENVIRONMENT}"
        - name: DEPLOYMENT_TYPE
          value: "canary"
        - name: DEPLOYMENT_ID
          value: "${DEPLOYMENT_ID}"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 250m
            memory: 256Mi
EOF

    kubectl apply -f "/tmp/canary-deployment.yaml"

    # Wait for canary to be ready
    info "Waiting for canary deployment to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/${SERVICE_NAME}-canary -n "$NAMESPACE"

    # Health check canary
    info "Performing health check on canary deployment..."
    if ! perform_health_check "${SERVICE_NAME}-canary"; then
        error_exit "Canary health check failed"
    fi

    # Monitor canary for specified duration (default 5 minutes)
    local monitor_duration="${CANARY_MONITOR_DURATION:-300}"
    info "Monitoring canary deployment for ${monitor_duration}s..."

    local canary_start_time=$(date +%s)
    local end_time=$((canary_start_time + monitor_duration))

    while [[ $(date +%s) -lt $end_time ]]; do
        if ! check_canary_health; then
            error_exit "Canary monitoring detected issues"
        fi
        echo -n "."
        sleep 10
    done
    echo

    # Prompt for promotion decision
    echo
    warn "Canary monitoring completed successfully."
    echo "1) Promote canary to full deployment"
    echo "2) Rollback to previous version"
    echo "3) Continue monitoring"
    echo
    read -p "Choose action (1/2/3): " -n 1 -r
    echo

    case $REPLY in
        1)
            promote_canary "$new_image" "$version"
            ;;
        2)
            perform_rollback
            return 1
            ;;
        3)
            info "Continuing monitoring... (manual promotion required)"
            ;;
        *)
            warn "Invalid choice. Keeping canary running for manual evaluation."
            ;;
    esac

    rm -f "/tmp/canary-deployment.yaml"
}

# Promote canary to full deployment
promote_canary() {
    local new_image="$1"
    local version="$2"

    info "Promoting canary to full deployment..."

    # Scale down canary and update main deployment
    kubectl scale deployment "$SERVICE_NAME" -n "$NAMESPACE" --replicas=0
    kubectl patch deployment "$SERVICE_NAME" -n "$NAMESPACE" -p "{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"$SERVICE_NAME\",\"image\":\"$new_image\"}]}}}}"
    kubectl scale deployment "$SERVICE_NAME" -n "$NAMESPACE" --replicas=3

    # Wait for deployment
    kubectl wait --for=condition=available --timeout=600s deployment/"$SERVICE_NAME" -n "$NAMESPACE"

    # Cleanup canary
    kubectl delete deployment "${SERVICE_NAME}-canary" -n "$NAMESPACE" --ignore-not-found=true

    success "Canary promoted successfully!"
}

# Check canary health during monitoring
check_canary_health() {
    # Check canary pod status
    local canary_ready=$(kubectl get pods -n "$NAMESPACE" -l deployment=canary -o jsonpath='{.items[*].status.containerStatuses[0].ready}' | tr ' ' '\n' | grep -c "true" || echo "0")
    local canary_total=$(kubectl get pods -n "$NAMESPACE" -l deployment=canary --no-headers | wc -l)

    if [[ $canary_ready -ne $canary_total ]]; then
        warn "Canary pods not ready: $canary_ready/$canary_total"
        return 1
    fi

    # Check error rates (this would require metrics integration)
    # For now, just basic pod health checks
    return 0
}

# Perform health check
perform_health_check() {
    local service_name="$1"
    local endpoint="${2:-/health}"
    local timeout="${HEALTH_CHECK_TIMEOUT}"

    info "Performing health check for $service_name..."

    # Get service URL
    local service_url
    if kubectl get service "$service_name" -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null | grep -q .; then
        local ip=$(kubectl get service "$service_name" -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
        local port=$(kubectl get service "$service_name" -n "$NAMESPACE" -o jsonpath='{.spec.ports[0].port}')
        service_url="http://$ip:$port$endpoint"
    else
        # Use port-forward for internal services
        local pf_port=8081
        kubectl port-forward -n "$NAMESPACE" service/"$service_name" $pf_port:80 >/dev/null 2>&1 &
        local pf_pid=$!
        sleep 5
        service_url="http://localhost:$pf_port$endpoint"
    fi

    # Perform health check with timeout
    local start_time=$(date +%s)
    local end_time=$((start_time + timeout))

    while [[ $(date +%s) -lt $end_time ]]; do
        if curl -f -s --max-time 5 "$service_url" >/dev/null 2>&1; then
            success "Health check passed for $service_name"
            [[ -n "${pf_pid:-}" ]] && kill $pf_pid 2>/dev/null || true
            return 0
        fi
        sleep 2
    done

    error "Health check failed for $service_name after ${timeout}s"
    [[ -n "${pf_pid:-}" ]] && kill $pf_pid 2>/dev/null || true
    return 1
}

# Perform rollback
perform_rollback() {
    if [[ ! -f "$ROLLBACK_FILE" && ! -f "$PREVIOUS_DEPLOYMENT_FILE" ]]; then
        error "No rollback information available"
        return 1
    fi

    local rollback_file="$ROLLBACK_FILE"
    if [[ ! -f "$ROLLBACK_FILE" ]]; then
        rollback_file="$PREVIOUS_DEPLOYMENT_FILE"
    fi

    info_banner "Initiating Rollback"
    info "Using rollback file: $rollback_file"

    # Source rollback information
    source "$rollback_file"

    info "Rolling back to previous deployment:"
    info "  Image: $PREVIOUS_IMAGE"
    info "  Replicas: $PREVIOUS_REPLICAS"
    info "  Timestamp: $ROLLBACK_TIMESTAMP"

    # Stop new deployment (if running)
    kubectl scale deployment "$SERVICE_NAME" -n "$NAMESPACE" --replicas=0

    # Restore previous deployment
    if [[ -f "$PREVIOUS_CONFIG_FILE" ]]; then
        kubectl apply -f "$PREVIOUS_CONFIG_FILE"
    else
        # Fallback to manual rollback
        kubectl set image deployment/"$SERVICE_NAME" "$SERVICE_NAME=$PREVIOUS_IMAGE" -n "$NAMESPACE"
        kubectl scale deployment "$SERVICE_NAME" -n "$NAMESPACE" --replicas="$PREVIOUS_REPLICAS"
    fi

    # Wait for rollback to complete
    kubectl wait --for=condition=available --timeout=300s deployment/"$SERVICE_NAME" -n "$NAMESPACE"

    # Verify rollback
    if perform_health_check "$SERVICE_NAME"; then
        success_banner "Rollback completed successfully!"
    else
        error "Rollback verification failed!"
        return 1
    fi
}

# Send deployment notification
send_notification() {
    local status="$1"
    local details="$2"

    local notification_message="PRP Deployment $status: $details (ID: $DEPLOYMENT_ID)"

    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$notification_message\"}" \
            "$SLACK_WEBHOOK_URL" || true
    fi

    if [[ -n "${EMAIL_RECIPIENT:-}" ]]; then
        echo "$notification_message" | mail -s "PRP Deployment $status" "$EMAIL_RECIPIENT" || true
    fi
}

# Main deployment function
main() {
    local image="$1"
    local version="${2:-latest}"
    local strategy="${3:-blue-green}"

    info_banner "Starting PRP CLI Deployment"
    info "Deployment ID: $DEPLOYMENT_ID"
    info "Environment: $ENVIRONMENT"
    info "Namespace: $NAMESPACE"
    info "Strategy: $strategy"
    info "Image: $image"
    info "Version: $version"

    # Validate strategy
    case "$strategy" in
        blue-green|canary|rolling)
            ;;
        *)
            error_exit "Invalid deployment strategy: $strategy. Use 'blue-green', 'canary', or 'rolling'"
            ;;
    esac

    check_prerequisites

    # Create deployment metadata
    local metadata_file
    metadata_file=$(create_deployment_metadata "$version" "$strategy" "$image")

    # Send deployment start notification
    send_notification "STARTED" "Deploying $version with $strategy strategy"

    # Execute deployment based on strategy
    case "$strategy" in
        blue-green)
            deploy_blue_green "$image" "$version"
            ;;
        canary)
            deploy_canary "$image" "$version" "${4:-10}"
            ;;
        rolling)
            # For rolling update, use kubectl set image
            info "Performing rolling update..."
            kubectl set image deployment/"$SERVICE_NAME" "$SERVICE_NAME=$image" -n "$NAMESPACE"
            kubectl rollout status deployment/"$SERVICE_NAME" -n "$NAMESPACE" --timeout=600s
            perform_health_check "$SERVICE_NAME"
            ;;
    esac

    success_banner "Deployment completed successfully!"
    info "Deployment ID: $DEPLOYMENT_ID"
    info "Strategy: $strategy"
    info "Version: $version"
    info "Rollback information saved"

    # Send deployment success notification
    send_notification "SUCCESS" "Successfully deployed $version with $strategy strategy"

    # Cleanup temp files
    rm -rf /tmp/prp-deployments
}

# Show usage
usage() {
    cat << EOF
Usage: $0 <image> <version> <strategy> [options]

Arguments:
  image     Container image to deploy (required)
  version   Version tag (default: latest)
  strategy  Deployment strategy: blue-green, canary, rolling (default: blue-green)

Options:
  --canary-weight=PERCENT   Traffic weight for canary deployment (default: 10)
  --monitor-duration=SECONDS   Canary monitoring duration (default: 300)
  --health-timeout=SECONDS   Health check timeout (default: 300)
  --disable-rollback      Disable automatic rollback on failure
  --namespace=NS         Kubernetes namespace (default: prp-system)
  --service-name=NAME    Service name (default: prp-mcp-server)

Examples:
  $0 ghcr.io/your-org/prp-cli:v1.2.3 v1.2.3 blue-green
  $0 ghcr.io/your-org/prp-cli:canary v1.2.4 canary --canary-weight=20 --monitor-duration=600
  $0 ghcr.io/your-org/prp-cli:v1.2.5 v1.2.5 rolling
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --canary-weight=*)
            CANARY_WEIGHT="${1#*=}"
            shift
            ;;
        --monitor-duration=*)
            CANARY_MONITOR_DURATION="${1#*=}"
            shift
            ;;
        --health-timeout=*)
            HEALTH_CHECK_TIMEOUT="${1#*=}"
            shift
            ;;
        --disable-rollback)
            ROLLBACK_ENABLED="false"
            shift
            ;;
        --namespace=*)
            NAMESPACE="${1#*=}"
            shift
            ;;
        --service-name=*)
            SERVICE_NAME="${1#*=}"
            shift
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        -*)
            error "Unknown option: $1"
            usage
            exit 1
            ;;
        *)
            break
            ;;
    esac
done

# Check required arguments
if [[ $# -lt 1 ]]; then
    error "Missing required arguments"
    usage
    exit 1
fi

# Run main function
main "$@"