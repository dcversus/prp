#!/bin/bash
# PRP CLI Rollback Script
# Manual rollback to previous deployment

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_LOG="/var/log/prp-deployment.log"
NAMESPACE="${NAMESPACE:-prp-system}"
SERVICE_NAME="${SERVICE_NAME:-prp-mcp-server}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
    exit 1
}

# Success banner
success_banner() {
    local message="$1"
    echo -e "\n${GREEN}🎉 ${message} 🎉${NC}\n"
    success "$message"
}

# Warning banner
warn_banner() {
    local message="$1"
    echo -e "\n${YELLOW}⚠️  ${message} ⚠️\n"
}

# List available rollback points
list_rollback_points() {
    info "Available rollback points:"

    local rollback_dir="/var/lib/prp-deployments"
    if [[ ! -d "$rollback_dir" ]]; then
        error "No rollback directory found at $rollback_dir"
        return 1
    fi

    local index=1
    local rollback_files=()

    # List rollback files sorted by timestamp
    while IFS= read -r -d '' file; do
        if [[ "$file" =~ rollback-.*\.txt$ ]]; then
            rollback_files+=("$file")
        fi
    done < <(find "$rollback_dir" -name "rollback-*.txt" -print0 | sort -z -r)

    if [[ ${#rollback_files[@]} -eq 0 ]]; then
        error "No rollback points found"
        return 1
    fi

    for file in "${rollback_files[@]}"; do
        local basename=$(basename "$file")
        local deployment_id=$(grep "^DEPLOYMENT_ID=" "$file" | cut -d'"' -f2 || echo "unknown")
        local previous_image=$(grep "^PREVIOUS_IMAGE=" "$file" | cut -d'"' -f2 || echo "unknown")
        local rollback_timestamp=$(grep "^ROLLBACK_TIMESTAMP=" "$file" | cut -d'"' -f2 || echo "unknown")

        echo "  $index) $basename"
        echo "     Deployment ID: $deployment_id"
        echo "     Previous Image: $previous_image"
        echo "     Rollback Timestamp: $rollback_timestamp"
        echo ""

        ((index++))
    done

    # Check for last deployment file
    if [[ -f "/var/lib/prp-deployments/last-deployment.txt" ]]; then
        echo "  $index) Last deployment ($(basename /var/lib/prp-deployments/last-deployment.txt))"
        echo ""
        ((index++))
    fi

    return 0
}

# Perform rollback from file
rollback_from_file() {
    local rollback_file="$1"

    if [[ ! -f "$rollback_file" ]]; then
        error_exit "Rollback file not found: $rollback_file"
    fi

    warn_banner "Initiating Rollback from $(basename "$rollback_file")"

    # Source rollback information
    source "$rollback_file"

    info "Rollback Details:"
    info "  Deployment ID: $DEPLOYMENT_ID"
    info "  Namespace: $NAMESPACE"
    info "  Service Name: $SERVICE_NAME"
    info "  Previous Image: $PREVIOUS_IMAGE"
    info "  Previous Replicas: $PREVIOUS_REPLICAS"
    info "  Rollback Timestamp: $ROLLBACK_TIMESTAMP"

    # Confirm rollback
    echo
    warn "This will rollback the deployment to the previous version."
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Rollback cancelled by user"
        exit 0
    fi

    # Scale down current deployment
    info "Scaling down current deployment..."
    kubectl scale deployment "$SERVICE_NAME" -n "$NAMESPACE" --replicas=0

    # Restore previous deployment
    if [[ -n "${PREVIOUS_CONFIG_FILE:-}" && -f "$PREVIOUS_CONFIG_FILE" ]]; then
        info "Restoring deployment from config file..."
        kubectl apply -f "$PREVIOUS_CONFIG_FILE"
    else
        info "Restoring deployment manually..."

        # Stop current deployment
        kubectl scale deployment "$SERVICE_NAME" -n "$NAMESPACE" --replicas=0

        # Update image and replicas
        kubectl set image deployment/"$SERVICE_NAME" "$SERVICE_NAME=$PREVIOUS_IMAGE" -n "$NAMESPACE" || {
            warn "Failed to set image, attempting to recreate deployment..."
            # If image update fails, recreate deployment
            cat > "/tmp/rollback-deployment.yaml" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${SERVICE_NAME}
  namespace: ${NAMESPACE}
spec:
  replicas: ${PREVIOUS_REPLICAS}
  selector:
    matchLabels:
      app: ${SERVICE_NAME}
  template:
    metadata:
      labels:
        app: ${SERVICE_NAME}
        version: rollback
    spec:
      containers:
      - name: ${SERVICE_NAME}
        image: ${PREVIOUS_IMAGE}
        ports:
        - containerPort: 8080
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
EOF
            kubectl apply -f "/tmp/rollback-deployment.yaml"
            rm -f "/tmp/rollback-deployment.yaml"
        }

        kubectl scale deployment "$SERVICE_NAME" -n "$NAMESPACE" --replicas="$PREVIOUS_REPLICAS"
    fi

    # Wait for deployment to be ready
    info "Waiting for rollback to complete..."
    kubectl wait --for=condition=available --timeout=300s deployment/"$SERVICE_NAME" -n "$NAMESPACE"

    # Verify rollback
    info "Verifying rollback..."
    if perform_health_check "$SERVICE_NAME"; then
        success_banner "Rollback completed successfully!"

        # Create rollback metadata
        local rollback_metadata="/var/lib/prp-deployments/rollback-metadata-$(date +%Y%m%d_%H%M%S).json"
        cat > "$rollback_metadata" << EOF
{
  "rollback_id": "rollback-$(date +%Y%m%d_%H%M%S)",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "original_deployment_id": "$DEPLOYMENT_ID",
  "namespace": "$NAMESPACE",
  "service_name": "$SERVICE_NAME",
  "rolled_back_to": "$PREVIOUS_IMAGE",
  "rolled_back_by": "$(whoami)",
  "rollback_file": "$rollback_file",
  "success": true
}
EOF
        info "Rollback metadata saved: $rollback_metadata"
    else
        error_exit "Rollback verification failed!"
    fi
}

# Perform health check
perform_health_check() {
    local service_name="$1"
    local timeout="${HEALTH_CHECK_TIMEOUT:-300}"

    info "Performing health check for $service_name..."

    # Get service URL
    local service_url
    if kubectl get service "$service_name" -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null | grep -q .; then
        local ip=$(kubectl get service "$service_name" -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
        local port=$(kubectl get service "$service_name" -n "$NAMESPACE" -o jsonpath='{.spec.ports[0].port}')
        service_url="http://$ip:$port/health"
    else
        # Use port-forward for internal services
        local pf_port=8082
        kubectl port-forward -n "$NAMESPACE" service/"$service_name" $pf_port:80 >/dev/null 2>&1 &
        local pf_pid=$!
        sleep 5
        service_url="http://localhost:$pf_port/health"
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

# Get current deployment status
get_deployment_status() {
    info "Current deployment status:"

    if kubectl get deployment "$SERVICE_NAME" -n "$NAMESPACE" >/dev/null 2>&1; then
        local replicas=$(kubectl get deployment "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
        local ready_replicas=$(kubectl get deployment "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' || echo "0")
        local current_image=$(kubectl get deployment "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}')
        local deployment_age=$(kubectl get deployment "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.metadata.creationTimestamp}')

        echo "  Service: $SERVICE_NAME"
        echo "  Namespace: $NAMESPACE"
        echo "  Replicas: $ready_replicas/$replicas ready"
        echo "  Current Image: $current_image"
        echo "  Deployment Age: $deployment_age"

        # Get pod status
        echo "  Pod Status:"
        kubectl get pods -n "$NAMESPACE" -l app="$SERVICE_NAME" -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,READY:.status.containerStatuses[0].ready,RESTARTS:.status.restartCount || echo "    No pods found"
    else
        error "Deployment $SERVICE_NAME not found in namespace $NAMESPACE"
    fi
}

# Send rollback notification
send_notification() {
    local status="$1"
    local details="$2"

    local notification_message="PRP Rollback $status: $details"

    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$notification_message\"}" \
            "$SLACK_WEBHOOK_URL" || true
    fi

    if [[ -n "${EMAIL_RECIPIENT:-}" ]]; then
        echo "$notification_message" | mail -s "PRP Rollback $status" "$EMAIL_RECIPIENT" || true
    fi
}

# Show usage
usage() {
    cat << EOF
Usage: $0 [OPTION]

Rollback PRP CLI deployment to previous version.

Options:
  --list                     List available rollback points
  --from-file FILE           Rollback from specific file
  --last-deployment          Rollback to last deployment
  --status                   Show current deployment status
  --namespace=NS            Kubernetes namespace (default: prp-system)
  --service-name=NAME       Service name (default: prp-mcp-server)
  --health-timeout=SECONDS   Health check timeout (default: 300)
  --help, -h                 Show this help message

Examples:
  $0 --list                              # List available rollback points
  $0 --last-deployment                   # Rollback to last deployment
  $0 --from-file /var/lib/prp-deployments/rollback-deploy-20231122_143022.txt
  $0 --status                            # Show current deployment status
EOF
}

# Main function
main() {
    local rollback_file=""
    local list_only=false
    local show_status=false
    local use_last_deployment=false

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --list)
                list_only=true
                shift
                ;;
            --from-file=*)
                rollback_file="${1#*=}"
                shift
                ;;
            --last-deployment)
                use_last_deployment=true
                shift
                ;;
            --status)
                show_status=true
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
            --health-timeout=*)
                HEALTH_CHECK_TIMEOUT="${1#*=}"
                shift
                ;;
            --help|-h)
                usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done

    # Check prerequisites
    if ! command -v kubectl >/dev/null 2>&1; then
        error_exit "kubectl is not installed or not in PATH"
    fi

    if ! kubectl cluster-info >/dev/null 2>&1; then
        error_exit "Cannot connect to Kubernetes cluster"
    fi

    # Execute requested action
    if [[ "$show_status" == "true" ]]; then
        get_deployment_status
        exit 0
    fi

    if [[ "$list_only" == "true" ]]; then
        list_rollback_points
        exit 0
    fi

    # Determine rollback file
    if [[ "$use_last_deployment" == "true" ]]; then
        rollback_file="/var/lib/prp-deployments/last-deployment.txt"
        if [[ ! -f "$rollback_file" ]]; then
            error_exit "Last deployment file not found: $rollback_file"
        fi
    elif [[ -z "$rollback_file" ]]; then
        # Interactive selection
        if ! list_rollback_points; then
            error_exit "No rollback points available"
        fi

        echo
        read -p "Select rollback point number (or 'q' to quit): " selection

        if [[ "$selection" == "q" || "$selection" == "Q" ]]; then
            info "Rollback cancelled by user"
            exit 0
        fi

        # Convert selection to rollback file
        local rollback_dir="/var/lib/prp-deployments"
        local rollback_files=()

        while IFS= read -r -d '' file; do
            if [[ "$file" =~ rollback-.*\.txt$ ]]; then
                rollback_files+=("$file")
            fi
        done < <(find "$rollback_dir" -name "rollback-*.txt" -print0 | sort -z -r)

        # Add last deployment file if it exists
        if [[ -f "/var/lib/prp-deployments/last-deployment.txt" ]]; then
            rollback_files+=("/var/lib/prp-deployments/last-deployment.txt")
        fi

        if [[ "$selection" =~ ^[0-9]+$ ]] && [[ "$selection" -ge 1 ]] && [[ "$selection" -le ${#rollback_files[@]} ]]; then
            rollback_file="${rollback_files[$((selection-1))]}"
        else
            error_exit "Invalid selection: $selection"
        fi
    fi

    # Perform rollback
    if [[ -f "$rollback_file" ]]; then
        # Send rollback start notification
        send_notification "STARTED" "Rolling back deployment using $(basename "$rollback_file")"

        rollback_from_file "$rollback_file"

        # Send rollback success notification
        send_notification "SUCCESS" "Rollback completed successfully"
    else
        error_exit "Rollback file not found: $rollback_file"
    fi
}

# Run main function
main "$@"